/**
 * AI Workout Generation API
 *
 * POST /api/ai/generate-workout
 *
 * Generates a complete workout from natural language input:
 * - "Upper body, dumbbells only, 45 minutes"
 * - "Leg day with squats and deadlifts"
 * - "Full body strength workout"
 */
import { NextRequest, NextResponse } from 'next/server';
import { getOptionalAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers, dynamoDBWorkouts, DynamoDBWorkout } from '@/lib/dynamodb';
import { generateWorkout, validateGeneratedWorkout } from '@/lib/ai/workout-generator';
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

interface GenerateWorkoutRequest {
  prompt: string;
}

interface GenerateWorkoutResponse {
  success: boolean;
  workout?: DynamoDBWorkout;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  quotaRemaining?: number;
  rationale?: string;
  alternatives?: string[];
  error?: string;
  isGuest?: boolean;
  aiUsed?: number;
  aiLimit?: number;
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateWorkoutResponse>> {
  try {
    const auth = await getOptionalAuthenticatedSession();
    const guestSession = auth ? null : await getOrCreateGuestSession(req.headers);
    const respond = <T extends GenerateWorkoutResponse>(response: NextResponse<T>) =>
      (guestSession ? applyGuestSessionCookie(response, guestSession) : response) as NextResponse<T>;
    const actorId = auth?.userId ?? guestSession!.actorId;
    const rateLimitId = auth?.userId ?? guestSession!.rateLimitId;

    // Rate limiting (30 AI requests per hour across all AI features)
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

    // Parse request
    const body: GenerateWorkoutRequest = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return respond(NextResponse.json(
        { success: false, error: 'Prompt is required and must be a non-empty string' },
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
        console.log('[AI Generate] User not found in DynamoDB, creating with defaults');
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
          console.log('[AI Generate] User created successfully');
        } catch (createError) {
          console.error('[AI Generate] Failed to create user:', createError);
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
          ? 'AI workout generation is not available on the free tier. Upgrade to Core ($8.99/mo) for 10 AI requests per month.'
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
          console.warn(`[AI Generate] User ${auth.userId} approaching usage cap:`, {
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
      if (guestSession.usage.aiUsed >= GUEST_AI_LIMIT) {
        return respond(
          buildGuestQuotaExceededResponse({
            feature: 'ai',
            used: guestSession.usage.aiUsed,
            limit: GUEST_AI_LIMIT,
          }) as NextResponse<GenerateWorkoutResponse>
        );
      }

      const guestQuota = await consumeGuestQuota(guestSession.guestId, 'ai', GUEST_AI_LIMIT);
      if (!guestQuota.success) {
        return respond(
          buildGuestQuotaExceededResponse({
            feature: 'ai',
            used: guestQuota.usage.aiUsed,
            limit: GUEST_AI_LIMIT,
          }) as NextResponse<GenerateWorkoutResponse>
        );
      }
      aiUsedAfter = guestQuota.usage.aiUsed;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    console.log('[AI Generate] Starting workout generation...');
    if (!isProduction) {
      console.log('[AI Generate] Prompt:', prompt);
    }
    console.log('[AI Generate] Quota remaining:', isAdmin ? 'unlimited' : aiLimit - aiUsedAfter);

    // Get user's training profile (if available)
    const trainingProfile = user?.trainingProfile || undefined;

    // Generate workout using AI
    const result = await generateWorkout({
      prompt,
      trainingProfile,
      userId: actorId,
      subscriptionTier: tier,
    });

    // Validate generated workout
    const validation = validateGeneratedWorkout(result.workout);
    if (!validation.valid) {
      console.error('[AI Generate] Generated workout failed validation:', validation.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Generated workout is invalid. Please try again with a different prompt.',
        },
        { status: 500 }
      );
    }

    // Convert AI workout format to DynamoDB format
    const exercises = result.workout.exercises?.map((exercise: any) => ({
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: exercise.name,
      sets: exercise.sets || 1,
      reps: exercise.reps || null,
      weight: exercise.weight || null,
      restSeconds: exercise.restSeconds || null,
      notes: exercise.notes || null,
      duration: exercise.duration || null,
      setDetails: [],
    })) || [];

    if (!auth) {
      const guestWorkout: Partial<DynamoDBWorkout> = {
        workoutId: `guest_ai_${Date.now()}`,
        title: result.workout.title || 'AI Generated Workout',
        description: result.workout.description || '',
        exercises,
        content: prompt,
        tags: result.workout.tags || [],
        difficulty: result.workout.difficulty || 'intermediate',
        totalDuration: result.workout.duration || 60,
        source: 'ai-generate',
        type: 'manual',
        workoutType: 'standard',
        aiEnhanced: true,
        aiNotes: [
          `AI generated workout from prompt: "${prompt}"`,
          `Rationale: ${result.rationale}`,
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return respond(NextResponse.json({
        success: true,
        workout: guestWorkout as DynamoDBWorkout,
        cost: {
          inputTokens: result.bedrockResponse.usage.inputTokens,
          outputTokens: result.bedrockResponse.usage.outputTokens,
          estimatedCost: result.bedrockResponse.cost?.total || 0,
        },
        quotaRemaining: Math.max(0, GUEST_AI_LIMIT - aiUsedAfter),
        rationale: result.rationale,
        alternatives: result.alternatives,
        isGuest: true,
        aiUsed: aiUsedAfter,
        aiLimit: GUEST_AI_LIMIT,
      }));
    }

    // Create workout in DynamoDB
    const newWorkout: Partial<DynamoDBWorkout> = {
      userId: auth.userId,
      workoutId: `workout_${Date.now()}`,
      title: result.workout.title || 'AI Generated Workout',
      description: result.workout.description || '',
      exercises,
      content: prompt, // Store original prompt
      tags: result.workout.tags || [],
      difficulty: result.workout.difficulty || 'intermediate',
      totalDuration: result.workout.duration || 60,
      source: 'ai-generate',
      type: 'manual',
      workoutType: 'standard',
      aiEnhanced: true,
      aiNotes: [
        `AI generated workout from prompt: "${prompt}"`,
        `Rationale: ${result.rationale}`,
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamoDBWorkouts.upsert(auth.userId, newWorkout as DynamoDBWorkout);
    const savedWorkout = newWorkout as DynamoDBWorkout;

    console.log('[AI Generate] Success!');
    console.log('[AI Generate] Workout:', savedWorkout.title);
    console.log('[AI Generate] Exercises:', exercises.length);
    console.log('[AI Generate] Tokens:', result.bedrockResponse.usage);
    console.log('[AI Generate] Cost:', result.bedrockResponse.cost?.total.toFixed(4));

    return NextResponse.json({
      success: true,
      workout: savedWorkout,
      cost: {
        inputTokens: result.bedrockResponse.usage.inputTokens,
        outputTokens: result.bedrockResponse.usage.outputTokens,
        estimatedCost: result.bedrockResponse.cost?.total || 0,
      },
      quotaRemaining: isAdmin ? 999999 : Math.max(0, aiLimit - aiUsedAfter),
      rationale: result.rationale,
      alternatives: result.alternatives,
      isGuest: false,
      aiUsed: aiUsedAfter,
      aiLimit,
    });
  } catch (error) {
    console.error('[AI Generate] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate workout',
      },
      { status: 500 }
    );
  }
}
