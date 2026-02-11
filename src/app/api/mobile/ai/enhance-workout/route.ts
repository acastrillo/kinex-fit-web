/**
 * Mobile AI Workout Enhancement Endpoint
 *
 * POST /api/mobile/ai/enhance-workout
 *
 * Enhances workout text using AI. Accepts either raw text (from OCR/manual input)
 * or a workoutId to enhance an existing workout.
 *
 * Request Body:
 * {
 *   "text": "Bench Press 3x10...",  // Raw workout text
 *   // OR
 *   "workoutId": "workout_123..."   // Existing workout ID
 * }
 *
 * Response:
 * {
 *   "workout": {
 *     "title": "Upper Body Push",
 *     "description": "...",
 *     "exercises": [...],
 *     ...
 *   },
 *   "quotaRemaining": 7
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { dynamoDBUsers, dynamoDBWorkouts, type DynamoDBWorkout } from "@/lib/dynamodb";
import {
  structureWorkout,
  type TrainingContext,
} from "@/lib/ai/workout-enhancer";
import {
  organizeWorkoutContent,
  validateOrganizedContent,
} from "@/lib/ai/workout-content-organizer";
import {
  getAIRequestLimit,
  normalizeSubscriptionTier,
} from "@/lib/subscription-tiers";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasRole } from "@/lib/rbac";
import { checkUsageCap } from "@/lib/ai/usage-tracking";

export const runtime = "nodejs";

// Request validation
const enhanceRequestSchema = z.object({
  text: z.string().min(1).optional(),
  workoutId: z.string().optional(),
}).refine(
  (data) => data.text || data.workoutId,
  { message: "Either 'text' or 'workoutId' is required" }
);

/**
 * Convert AI flat format to DynamoDB format
 */
function convertAIToDynamoDB(aiExercises: any[]): any[] {
  return aiExercises.map((exercise) => ({
    id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: exercise.name,
    sets: exercise.sets || 1,
    reps: exercise.reps || null,
    weight: exercise.weight || null,
    restSeconds: exercise.restSeconds || null,
    notes: exercise.notes || null,
    duration: exercise.duration || null,
    setDetails: [],
  }));
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  // Authenticate mobile request
  const auth = await authenticateMobileRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = auth;

  try {
    // Rate limit check
    const rateLimit = await checkRateLimit(userId, "api:ai");
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many AI requests",
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = enhanceRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { text, workoutId } = parsed.data;

    console.log(`[Mobile AI:${requestId}] Enhance request from user ${userId}`);

    // Get user and check quota
    let user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = normalizeSubscriptionTier(user.subscriptionTier);
    const aiLimit = getAIRequestLimit(tier);
    const aiUsed = user.aiRequestsUsed || 0;
    const isAdmin = hasRole(user, "admin");

    // Check quota (skip for admins)
    if (!isAdmin && aiLimit <= 0) {
      return NextResponse.json(
        {
          error: "AI features are not available on the free tier. Upgrade to Core for AI access.",
          quotaRemaining: 0,
        },
        { status: 403 }
      );
    }

    if (!isAdmin && aiUsed >= aiLimit) {
      return NextResponse.json(
        {
          error: `You've reached your AI limit (${aiUsed}/${aiLimit} used this month).`,
          quotaRemaining: 0,
        },
        { status: 403 }
      );
    }

    // Check usage caps
    if (!isAdmin) {
      const capCheck = await checkUsageCap(userId, tier);
      if (!capCheck.allowed) {
        return NextResponse.json(
          {
            error: `Usage cap exceeded: ${capCheck.reason}`,
            quotaRemaining: 0,
          },
          { status: 403 }
        );
      }
    }

    // Consume quota
    let aiUsedAfter = aiUsed;
    if (!isAdmin) {
      const consumeResult = await dynamoDBUsers.consumeQuota(userId, "aiRequestsUsed", aiLimit);
      if (!consumeResult.success) {
        return NextResponse.json(
          {
            error: "AI quota exhausted",
            quotaRemaining: 0,
          },
          { status: 403 }
        );
      }
      aiUsedAfter = consumeResult.newValue ?? aiUsed + 1;
    }

    // Determine text to enhance
    let textToEnhance: string;
    let existingWorkout: DynamoDBWorkout | null = null;

    if (workoutId) {
      const workout = await dynamoDBWorkouts.get(userId, workoutId);
      if (!workout) {
        return NextResponse.json({ error: "Workout not found" }, { status: 404 });
      }
      existingWorkout = workout;
      textToEnhance = JSON.stringify({
        title: workout.title,
        description: workout.description,
        exercises: workout.exercises,
      }, null, 2);
    } else {
      textToEnhance = text!;
    }

    console.log(`[Mobile AI:${requestId}] Starting AI enhancement...`);

    // Build training context
    const trainingContext: TrainingContext = {
      userId,
      experience: user.experience || "intermediate",
      subscriptionTier: tier,
      workoutId,
    };

    // Step 1: Organize content (Agent 1 - Haiku)
    const organizationResult = await organizeWorkoutContent(textToEnhance);

    if (!validateOrganizedContent(organizationResult.organized)) {
      console.error(`[Mobile AI:${requestId}] Agent 1 returned invalid content`);
      return NextResponse.json(
        { error: "Failed to process workout text. Please try again." },
        { status: 500 }
      );
    }

    // Step 2: Structure workout (Agent 2 - Sonnet)
    const result = await structureWorkout(organizationResult.organized, trainingContext);

    // Convert exercises to DynamoDB format
    const convertedExercises = result.enhancedWorkout.exercises
      ? convertAIToDynamoDB(result.enhancedWorkout.exercises)
      : [];

    // Build response workout
    const responseWorkout = {
      workoutId: existingWorkout?.workoutId || `workout_${Date.now()}`,
      title: result.enhancedWorkout.title || "Untitled Workout",
      description: result.enhancedWorkout.description || "",
      exercises: convertedExercises,
      tags: result.enhancedWorkout.tags || [],
      difficulty: result.enhancedWorkout.difficulty || "intermediate",
      totalDuration: result.enhancedWorkout.duration || 60,
      workoutType: result.enhancedWorkout.workoutType || "standard",
      structure: result.enhancedWorkout.structure || null,
      aiEnhanced: true,
      aiNotes: result.enhancedWorkout.aiNotes || [],
    };

    // If enhancing existing workout, save changes
    if (existingWorkout && workoutId) {
      await dynamoDBWorkouts.update(userId, workoutId, {
        ...responseWorkout,
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(`[Mobile AI:${requestId}] Enhancement complete: ${responseWorkout.title}`);

    return NextResponse.json({
      workout: responseWorkout,
      quotaRemaining: isAdmin ? 999999 : Math.max(0, aiLimit - aiUsedAfter),
    });
  } catch (error) {
    console.error(`[Mobile AI:${requestId}] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enhancement failed" },
      { status: 500 }
    );
  }
}
