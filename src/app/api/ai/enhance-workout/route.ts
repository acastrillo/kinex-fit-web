/**
 * AI Workout Enhancement API
 *
 * POST /api/ai/enhance-workout
 *
 * Takes a workout and uses AI to:
 * - Clean up formatting
 * - Add missing details (rest times, tempo, form cues)
 * - Suggest alternatives for exercises
 * - Optimize exercise order
 * - Add personalized notes based on user's training profile
 */
import { NextRequest, NextResponse } from 'next/server';
import { getOptionalAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers, dynamoDBWorkouts, DynamoDBWorkout } from '@/lib/dynamodb';
import {
  structureWorkout,
  estimateEnhancementCost,
  type TrainingContext
} from '@/lib/ai/workout-enhancer';
import {
  organizeWorkoutContent,
  validateOrganizedContent,
} from '@/lib/ai/workout-content-organizer';
import {
  suggestTimerForWorkout,
  type WorkoutForTimerSuggestion,
  type TimerSuggestion
} from '@/lib/ai/timer-suggester';
import { getAIRequestLimit, normalizeSubscriptionTier } from '@/lib/subscription-tiers';
import { checkRateLimit } from '@/lib/rate-limit';
import { hasRole } from '@/lib/rbac';
import { checkUsageCap } from '@/lib/ai/usage-tracking';
import { isMonthlyResetDue } from '@/lib/quota-reset';
import {
  applyGuestSessionCookie,
  buildGuestQuotaExceededResponse,
  consumeGuestQuota,
  GUEST_AI_LIMIT,
  getOrCreateGuestSession,
} from '@/lib/guest-session';

interface EnhanceWorkoutRequest {
  // Either workoutId (enhance existing) or rawText (parse new)
  workoutId?: string;
  rawText?: string;
  enhancementType?: 'full' | 'format' | 'details' | 'optimize';
}

interface EnhanceWorkoutResponse {
  success: boolean;
  enhancedWorkout?: DynamoDBWorkout;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  quotaRemaining?: number;
  error?: string;
  isGuest?: boolean;
  aiUsed?: number;
  aiLimit?: number;
}

/**
 * Convert AI flat format to DynamoDB format
 */
function convertAIToDynamoDB(aiExercises: any[]): any[] {
  return aiExercises.map((exercise) => {
    // AI now returns flat format matching our table structure
    // AI format: { name, sets: 3, reps: "10" or "150M", weight: "135 lbs", duration: 200, notes, restSeconds }
    // DynamoDB format: { id, name, sets: number, reps, weight, restSeconds, notes, setDetails: [] }

    return {
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: exercise.name,
      sets: exercise.sets || 1,
      reps: exercise.reps || null,
      weight: exercise.weight || null,
      restSeconds: exercise.restSeconds || null,
      notes: exercise.notes || null,
      duration: exercise.duration || null,
      // Keep empty setDetails for backward compatibility
      setDetails: [],
    };
  });
}

export async function POST(req: NextRequest): Promise<NextResponse<EnhanceWorkoutResponse>> {
  try {
    const auth = await getOptionalAuthenticatedSession();
    const guestSession = auth ? null : await getOrCreateGuestSession(req.headers);
    const respond = <T extends EnhanceWorkoutResponse>(response: NextResponse<T>) =>
      (guestSession ? applyGuestSessionCookie(response, guestSession) : response) as NextResponse<T>;
    const actorId = auth?.userId ?? guestSession!.actorId;
    const rateLimitId = auth?.userId ?? guestSession!.rateLimitId;

    // RATE LIMITING: Check rate limit (30 AI requests per hour)
    const rateLimit = await checkRateLimit(rateLimitId, 'api:ai');
    if (!rateLimit.success) {
      return respond(NextResponse.json(
        {
          success: false,
          error: 'Too many AI requests',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      ));
    }

    const body: EnhanceWorkoutRequest = await req.json();
    const { workoutId, rawText, enhancementType = 'full' } = body;

    if (!workoutId && !rawText) {
      return respond(NextResponse.json(
        { success: false, error: 'Either workoutId or rawText is required' },
        { status: 400 }
      ));
    }

    let user = null;
    let tier = 'guest';
    let aiLimit = GUEST_AI_LIMIT;
    let aiUsed = guestSession?.usage.aiUsed ?? 0;
    let aiUsedAfter = aiUsed;
    let isAdmin = false;

    if (auth) {
      user = await dynamoDBUsers.get(auth.userId);
      if (!user) {
        console.log('[AI Enhance] User not found in DynamoDB, creating with defaults');
        try {
          const userEmail = auth.session.user?.email || `user-${auth.userId}@temp.com`;
          const firstName = (auth.session.user as any)?.firstName || null;
          const lastName = (auth.session.user as any)?.lastName || null;

          user = await dynamoDBUsers.upsert({
            id: auth.userId,
            email: userEmail,
            firstName,
            lastName,
            subscriptionTier: 'free',
            aiRequestsLimit: 0,
          });
          console.log('[AI Enhance] User created successfully');
        } catch (createError) {
          console.error('[AI Enhance] Failed to create user:', createError);
          return NextResponse.json(
            { success: false, error: 'User not found and could not be created. Please try logging out and back in.' },
            { status: 500 }
          );
        }
      }

      tier = normalizeSubscriptionTier(user.subscriptionTier);
      aiLimit = getAIRequestLimit(tier);
      isAdmin = hasRole(user, 'admin');
      aiUsed = user.aiRequestsUsed || 0;

      if (!isAdmin && isMonthlyResetDue(user.lastAiRequestReset)) {
        await dynamoDBUsers.resetAIQuota(auth.userId);
        aiUsed = 0;
      }

      if (!isAdmin && aiLimit <= 0) {
        const upgradeMessage = aiLimit === 0
          ? 'AI features are not available on the free tier. Upgrade to Core ($8.99/mo) for 10 AI requests per month.'
          : `You've reached your AI request limit (${aiUsed}/${aiLimit} used this month). Upgrade to Pro for more AI requests.`;

        return NextResponse.json(
          {
            success: false,
            error: upgradeMessage,
            quotaRemaining: 0,
            tier,
            aiUsed,
            aiLimit,
          },
          { status: 403 }
        );
      }

      if (!isAdmin) {
        const capCheck = await checkUsageCap(auth.userId, tier);
        if (!capCheck.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: `Usage cap exceeded: ${capCheck.reason}. Your plan will reset next month.`,
              quotaRemaining: 0,
              tier,
              usage: capCheck.usage,
              limits: capCheck.limits,
            },
            { status: 403 }
          );
        }

        if (capCheck.shouldWarn) {
          console.warn(`[AI Enhance] User ${auth.userId} approaching usage cap:`, {
            usage: capCheck.usage,
            limits: capCheck.limits,
            percentages: capCheck.percentages,
          });
        }

        const consumeResult = await dynamoDBUsers.consumeQuota(auth.userId, 'aiRequestsUsed', aiLimit);
        if (!consumeResult.success) {
          const upgradeMessage = `You've reached your AI request limit (${aiUsed}/${aiLimit} used this month). Upgrade to Pro for more AI requests.`;
          return NextResponse.json(
            {
              success: false,
              error: upgradeMessage,
              quotaRemaining: 0,
              tier,
              aiUsed,
              aiLimit,
            },
            { status: 403 }
          );
        }
        aiUsedAfter = consumeResult.newValue ?? aiUsed + 1;
      }
    } else if (guestSession) {
      if (workoutId) {
        return respond(NextResponse.json(
          {
            success: false,
            error: 'Sign in to enhance saved workouts. Guest AI is only available while importing new text.',
          },
          { status: 401 }
        ));
      }

      if (guestSession.usage.aiUsed >= GUEST_AI_LIMIT) {
        return respond(
          buildGuestQuotaExceededResponse({
            feature: 'ai',
            used: guestSession.usage.aiUsed,
            limit: GUEST_AI_LIMIT,
          }) as NextResponse<EnhanceWorkoutResponse>
        );
      }

      const guestQuota = await consumeGuestQuota(guestSession.guestId, 'ai', GUEST_AI_LIMIT);
      if (!guestQuota.success) {
        return respond(
          buildGuestQuotaExceededResponse({
            feature: 'ai',
            used: guestQuota.usage.aiUsed,
            limit: GUEST_AI_LIMIT,
          }) as NextResponse<EnhanceWorkoutResponse>
        );
      }
      aiUsedAfter = guestQuota.usage.aiUsed;
    }

    // Determine what we're enhancing: existing workout or raw text
    let textToEnhance: string;
    let existingWorkout: DynamoDBWorkout | null = null;

    if (workoutId) {
      if (!auth) {
        return respond(NextResponse.json(
          { success: false, error: 'Sign in to enhance saved workouts' },
          { status: 401 }
        ));
      }

      // Enhancing existing workout
      const workout = await dynamoDBWorkouts.get(auth.userId, workoutId);
      if (!workout) {
        return NextResponse.json(
          { success: false, error: 'Workout not found' },
          { status: 404 }
        );
      }
      existingWorkout = workout;
      // Convert workout to text for enhancement
      textToEnhance = JSON.stringify({
        title: workout.title,
        description: workout.description,
        exercises: workout.exercises,
      }, null, 2);
    } else if (rawText) {
      // Parsing raw text (from OCR or social media)
      textToEnhance = rawText;
    } else {
      return NextResponse.json(
        { success: false, error: 'Either workoutId or rawText is required' },
        { status: 400 }
      );
    }

    console.log('[AI Enhance] Starting two-step agentic workflow...');
    console.log('[AI Enhance] Enhancement type:', enhancementType);
    console.log('[AI Enhance] Quota remaining:', isAdmin ? 'unlimited' : aiLimit - aiUsedAfter);

    // Build training context (TODO: Get PRs from user profile)
    const trainingContext: TrainingContext = {
      userId: actorId,
      experience: user?.experience || 'intermediate',
      subscriptionTier: tier,
      workoutId: workoutId, // If enhancing existing workout
      // personalRecords: await getUserPRs(userId), // TODO: Implement
    };

    // STEP 1: Agent 1 - Organize Content (Filter exercises from fluff)
    console.log('[AI Enhance] Step 1: Organizing content with Agent 1 (Haiku)...');
    const organizationResult = await organizeWorkoutContent(textToEnhance);

    // Validate organized content
    if (!validateOrganizedContent(organizationResult.organized)) {
      console.error('[AI Enhance] Agent 1 returned invalid organized content');
      return NextResponse.json(
        { success: false, error: 'Failed to organize workout content. Please try again.' },
        { status: 500 }
      );
    }

    console.log('[AI Enhance] Agent 1 results:');
    console.log(`  - Exercise lines: ${organizationResult.organized.exerciseLines.length}`);
    console.log(`  - Notes: ${organizationResult.organized.notes.length}`);
    console.log(`  - Rejected: ${organizationResult.organized.rejected.length}`);
    if (organizationResult.organized.structure) {
      console.log(`  - Detected structure: ${organizationResult.organized.structure.type}`);
    }

    // STEP 2: Agent 2 - Structure Workout (Build final workout)
    console.log('[AI Enhance] Step 2: Structuring workout with Agent 2 (Sonnet)...');
    const result = await structureWorkout(organizationResult.organized, trainingContext);

    // STEP 3: Agent 3 - Suggest Timer Configuration (Optional)
    console.log('[AI Enhance] Step 3: Suggesting timer configuration with Agent 3 (Haiku)...');
    let timerSuggestion: TimerSuggestion | null = null;
    let timerSuggesterCost = 0;

    try {
      const workoutForTimer: WorkoutForTimerSuggestion = {
        title: result.enhancedWorkout.title,
        description: result.enhancedWorkout.description,
        workoutType: result.enhancedWorkout.workoutType,
        structure: result.enhancedWorkout.structure as any,
        exercises: result.enhancedWorkout.exercises as any,
        totalDuration: result.enhancedWorkout.duration,
        difficulty: result.enhancedWorkout.difficulty,
      };

      const timerResult = await suggestTimerForWorkout(workoutForTimer);
      timerSuggestion = timerResult.suggestion;
      timerSuggesterCost = timerResult.bedrockResponse.cost?.total || 0;

      console.log('[AI Enhance] Agent 3 results:');
      console.log(`  - Workout style: ${timerSuggestion.workoutStyle}`);
      console.log(`  - Primary goal: ${timerSuggestion.primaryGoal}`);
      if (timerSuggestion.suggestedTimer) {
        console.log(`  - Timer type: ${timerSuggestion.suggestedTimer.type}`);
        console.log(`  - Reason: ${timerSuggestion.suggestedTimer.reason}`);
      } else {
        console.log(`  - No timer suggested (not applicable for this workout)`);
      }
    } catch (error) {
      console.error('[AI Enhance] Timer suggestion failed (non-critical):', error);
      // Timer suggestion is optional, continue without it
    }

    // Calculate total cost (all three agents)
    const totalCost = (organizationResult.bedrockResponse.cost?.total || 0) +
                     (result.bedrockResponse.cost?.total || 0) +
                     timerSuggesterCost;
    console.log('[AI Enhance] Three-step workflow complete!');
    console.log(`  - Agent 1 cost: $${organizationResult.bedrockResponse.cost?.total.toFixed(4) || '0.0000'}`);
    console.log(`  - Agent 2 cost: $${result.bedrockResponse.cost?.total.toFixed(4) || '0.0000'}`);
    console.log(`  - Agent 3 cost: $${timerSuggesterCost.toFixed(4)}`);
    console.log(`  - Total cost: $${totalCost.toFixed(4)}`);

    // Convert AI exercises format to DynamoDB format
    const convertedExercises = result.enhancedWorkout.exercises
      ? convertAIToDynamoDB(result.enhancedWorkout.exercises)
      : [];

    // Extract workout structure metadata
    const workoutType = result.enhancedWorkout.workoutType || 'standard';
    const structure = result.enhancedWorkout.structure || null;

    // Build AI notes including timer suggestion
    const aiNotes = ['AI enhanced workout with standardized exercise names and proper structure detection'];
    if (timerSuggestion?.suggestedTimer) {
      aiNotes.push(
        `AI-suggested timer: ${timerSuggestion.suggestedTimer.type} - ${timerSuggestion.suggestedTimer.reason}`
      );
    }

    // Prepare timer config if suggested (will be stored in Phase 5 when DB schema is updated)
    const timerConfig = timerSuggestion?.suggestedTimer
      ? {
          params: timerSuggestion.suggestedTimer.params,
          aiGenerated: true,
          reason: timerSuggestion.suggestedTimer.reason,
        }
      : undefined;

    // If enhancing existing workout, merge with original
    let finalWorkout: DynamoDBWorkout;
    if (existingWorkout) {
      // Update existing workout
      const updates = {
        title: result.enhancedWorkout.title || existingWorkout.title,
        description: result.enhancedWorkout.description || existingWorkout.description || undefined,
        exercises: convertedExercises.length > 0 ? convertedExercises : existingWorkout.exercises,
        tags: result.enhancedWorkout.tags || existingWorkout.tags,
        difficulty: result.enhancedWorkout.difficulty || existingWorkout.difficulty,
        totalDuration: result.enhancedWorkout.duration || existingWorkout.totalDuration,
        workoutType,
        structure,
        aiEnhanced: true,
        aiNotes,
        timerConfig,
        updatedAt: new Date().toISOString(),
      };
      await dynamoDBWorkouts.update(auth!.userId, workoutId!, updates);
      finalWorkout = { ...existingWorkout, ...updates };
    } else if (!auth) {
      finalWorkout = {
        userId: actorId,
        workoutId: `guest_enhanced_${Date.now()}`,
        title: result.enhancedWorkout.title || 'Untitled Workout',
        description: result.enhancedWorkout.description || '',
        exercises: convertedExercises,
        content: textToEnhance,
        tags: result.enhancedWorkout.tags || [],
        difficulty: result.enhancedWorkout.difficulty || 'intermediate',
        totalDuration: result.enhancedWorkout.duration || 60,
        source: 'ai-parse',
        type: 'manual',
        workoutType,
        structure,
        aiEnhanced: true,
        aiNotes,
        timerConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as DynamoDBWorkout;
    } else {
      // Create new workout from parsed text
      const newWorkout: Partial<DynamoDBWorkout> = {
        userId: auth.userId,
        workoutId: `workout_${Date.now()}`,
        title: result.enhancedWorkout.title || 'Untitled Workout',
        description: result.enhancedWorkout.description || '',
        exercises: convertedExercises,
        content: textToEnhance, // Store original text
        tags: result.enhancedWorkout.tags || [],
        difficulty: result.enhancedWorkout.difficulty || 'intermediate',
        totalDuration: result.enhancedWorkout.duration || 60,
        source: 'ai-parse',
        type: 'manual',
        workoutType,
        structure,
        aiEnhanced: true,
        aiNotes,
        timerConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await dynamoDBWorkouts.upsert(auth.userId, newWorkout as DynamoDBWorkout);
      finalWorkout = newWorkout as DynamoDBWorkout;
    }

    // Calculate cost
    const cost = estimateEnhancementCost(textToEnhance.length);

    console.log('[AI Enhance] Success!');
    console.log('[AI Enhance] Workout Type:', workoutType);
    console.log('[AI Enhance] Structure:', structure);
    console.log('[AI Enhance] Tokens:', result.bedrockResponse.usage);
    console.log('[AI Enhance] Estimated cost:', cost);

    return respond(NextResponse.json({
      success: true,
      enhancedWorkout: finalWorkout,
      cost: {
        inputTokens: result.bedrockResponse.usage.inputTokens,
        outputTokens: result.bedrockResponse.usage.outputTokens,
        estimatedCost: result.bedrockResponse.cost?.total || cost,
      },
      quotaRemaining: isAdmin ? 999999 : Math.max(0, aiLimit - aiUsedAfter),
      isGuest: !auth,
      aiUsed: aiUsedAfter,
      aiLimit,
    }));
  } catch (error) {
    console.error('[AI Enhance] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enhance workout',
      },
      { status: 500 }
    );
  }
}

