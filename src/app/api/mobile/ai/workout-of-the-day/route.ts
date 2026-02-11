/**
 * Mobile AI Workout of the Day Endpoint
 *
 * GET /api/mobile/ai/workout-of-the-day
 *
 * Generates a personalized "Workout of the Day" recommendation:
 * - Uses training profile for personalization
 * - Considers recent workout history to avoid overtraining
 * - Varies workout types for balanced training
 * - Can return existing workout or generate new one
 *
 * Query params:
 * - generate=true: Force generation of a new workout
 *
 * Response:
 * {
 *   "workout": { ... },
 *   "isNew": true,
 *   "rationale": "...",
 *   "quotaRemaining": 7
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { dynamoDBUsers, dynamoDBWorkouts, type DynamoDBWorkout } from "@/lib/dynamodb";
import { generateWorkout, validateGeneratedWorkout } from "@/lib/ai/workout-generator";
import {
  getAIRequestLimit,
  normalizeSubscriptionTier,
} from "@/lib/subscription-tiers";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasRole } from "@/lib/rbac";

export const runtime = "nodejs";

/**
 * Get the most recent workouts to analyze training patterns
 */
async function getRecentWorkouts(userId: string, days: number = 7): Promise<DynamoDBWorkout[]> {
  try {
    const allWorkouts = await dynamoDBWorkouts.list(userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allWorkouts
      .filter((w) => {
        const workoutDate = new Date(w.completedDate || w.createdAt);
        return workoutDate >= cutoffDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.completedDate || a.createdAt);
        const dateB = new Date(b.completedDate || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  } catch (error) {
    console.error("[Mobile WOD] Error fetching recent workouts:", error);
    return [];
  }
}

/**
 * Determine what type of workout to recommend based on recent history
 */
function determineWorkoutFocus(recentWorkouts: DynamoDBWorkout[]): string {
  if (recentWorkouts.length === 0) {
    return "full body strength workout for beginners";
  }

  const lastWorkout = recentWorkouts[0];
  const lastWorkoutTags = lastWorkout.tags || [];

  if (lastWorkoutTags.some((t) => t.toLowerCase().includes("upper"))) {
    return "lower body strength workout";
  } else if (lastWorkoutTags.some((t) => t.toLowerCase().includes("lower"))) {
    return "full body workout with compound movements";
  } else if (lastWorkoutTags.some((t) => t.toLowerCase().includes("cardio"))) {
    return "upper body strength and hypertrophy workout";
  } else {
    return "cardio and conditioning workout";
  }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  // Authenticate mobile request
  const auth = await authenticateMobileRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = auth;

  try {
    // Check if user wants to force generation
    const { searchParams } = new URL(request.url);
    const forceGenerate = searchParams.get("generate") === "true";

    console.log(`[Mobile WOD:${requestId}] Request from user ${userId}, force=${forceGenerate}`);

    // Get user
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get recent workouts
    const recentWorkouts = await getRecentWorkouts(userId, 7);

    // If not forcing generation, try to return today's scheduled workout
    if (!forceGenerate) {
      const today = new Date().toISOString().split("T")[0];
      const scheduledToday = await dynamoDBWorkouts.getScheduledForDate(userId, today);

      if (scheduledToday.length > 0) {
        console.log(`[Mobile WOD:${requestId}] Returning scheduled workout for today`);
        return NextResponse.json({
          workout: scheduledToday[0],
          isNew: false,
          rationale: "You have a workout scheduled for today. Complete this to stay on track!",
        });
      }
    }

    // Check AI quota
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

    // Determine workout focus based on recent activity
    const workoutFocus = determineWorkoutFocus(recentWorkouts);
    const prompt = `Create a ${workoutFocus} optimized for today. Duration: 45-60 minutes. Make it challenging but achievable.`;

    console.log(`[Mobile WOD:${requestId}] Generating workout...`);
    console.log(`[Mobile WOD:${requestId}] Focus: ${workoutFocus}`);

    // Get user's training profile
    const trainingProfile = user.trainingProfile || undefined;

    // Generate workout using AI
    const result = await generateWorkout({
      prompt,
      trainingProfile,
      userId,
    });

    // Validate generated workout
    const validation = validateGeneratedWorkout(result.workout);
    if (!validation.valid) {
      console.error(`[Mobile WOD:${requestId}] Validation failed:`, validation.errors);
      return NextResponse.json(
        { error: "Generated workout is invalid. Please try again." },
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

    // Create workout in DynamoDB
    const today = new Date().toISOString().split("T")[0];
    const newWorkout: Partial<DynamoDBWorkout> = {
      userId,
      workoutId: `wod_${Date.now()}`,
      title: `Today's Workout - ${result.workout.title || "AI Generated"}`,
      description: result.workout.description || "",
      exercises,
      content: prompt,
      tags: [...(result.workout.tags || []), "workout-of-the-day"],
      difficulty: result.workout.difficulty || "intermediate",
      totalDuration: result.workout.duration || 60,
      source: "ai-wod-mobile",
      type: "manual",
      workoutType: "standard",
      aiEnhanced: true,
      aiNotes: [
        `Workout of the Day generated on ${today}`,
        `Focus: ${workoutFocus}`,
        `Rationale: ${result.rationale}`,
      ],
      status: "scheduled",
      scheduledDate: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamoDBWorkouts.upsert(userId, newWorkout as DynamoDBWorkout);
    const savedWorkout = newWorkout as DynamoDBWorkout;

    console.log(`[Mobile WOD:${requestId}] Success: ${savedWorkout.title}`);
    console.log(`[Mobile WOD:${requestId}] Exercises: ${exercises.length}`);

    return NextResponse.json({
      workout: savedWorkout,
      isNew: true,
      rationale: result.rationale,
      quotaRemaining: isAdmin ? 999999 : Math.max(0, aiLimit - aiUsedAfter),
    });
  } catch (error) {
    console.error(`[Mobile WOD:${requestId}] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get workout of the day" },
      { status: 500 }
    );
  }
}
