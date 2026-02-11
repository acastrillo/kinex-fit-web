/**
 * Mobile AI Workout Generation Endpoint
 *
 * POST /api/mobile/ai/generate-workout
 *
 * Generates a complete workout from natural language input:
 * - "Upper body, dumbbells only, 45 minutes"
 * - "Leg day with squats and deadlifts"
 * - "Full body strength workout"
 *
 * Request Body:
 * {
 *   "prompt": "30 minute full body workout with no equipment"
 * }
 *
 * Response:
 * {
 *   "workout": { ... },
 *   "quotaRemaining": 7,
 *   "rationale": "..."
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { dynamoDBUsers, dynamoDBWorkouts, type DynamoDBWorkout } from "@/lib/dynamodb";
import { generateWorkout, validateGeneratedWorkout } from "@/lib/ai/workout-generator";
import {
  getAIRequestLimit,
  normalizeSubscriptionTier,
} from "@/lib/subscription-tiers";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasRole } from "@/lib/rbac";
import { checkUsageCap } from "@/lib/ai/usage-tracking";

export const runtime = "nodejs";

// Request validation
const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

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
    const parsed = generateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prompt } = parsed.data;

    console.log(`[Mobile AI Generate:${requestId}] Request from user ${userId}`);
    console.log(`[Mobile AI Generate:${requestId}] Prompt: ${prompt.slice(0, 100)}...`);

    // Get user and check quota
    const user = await dynamoDBUsers.get(userId);
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

    console.log(`[Mobile AI Generate:${requestId}] Starting workout generation...`);

    // Get user's training profile
    const trainingProfile = user.trainingProfile || undefined;

    // Generate workout using AI
    const result = await generateWorkout({
      prompt,
      trainingProfile,
      userId,
      subscriptionTier: tier,
    });

    // Validate generated workout
    const validation = validateGeneratedWorkout(result.workout);
    if (!validation.valid) {
      console.error(`[Mobile AI Generate:${requestId}] Validation failed:`, validation.errors);
      return NextResponse.json(
        { error: "Generated workout is invalid. Please try again with a different prompt." },
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
    const newWorkout: Partial<DynamoDBWorkout> = {
      userId,
      workoutId: `workout_${Date.now()}`,
      title: result.workout.title || "AI Generated Workout",
      description: result.workout.description || "",
      exercises,
      content: prompt,
      tags: result.workout.tags || [],
      difficulty: result.workout.difficulty || "intermediate",
      totalDuration: result.workout.duration || 60,
      source: "ai-generate-mobile",
      type: "manual",
      workoutType: "standard",
      aiEnhanced: true,
      aiNotes: [
        `AI generated workout from prompt: "${prompt}"`,
        `Rationale: ${result.rationale}`,
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamoDBWorkouts.upsert(userId, newWorkout as DynamoDBWorkout);
    const savedWorkout = newWorkout as DynamoDBWorkout;

    console.log(`[Mobile AI Generate:${requestId}] Success: ${savedWorkout.title}`);
    console.log(`[Mobile AI Generate:${requestId}] Exercises: ${exercises.length}`);

    return NextResponse.json({
      workout: savedWorkout,
      quotaRemaining: isAdmin ? 999999 : Math.max(0, aiLimit - aiUsedAfter),
      rationale: result.rationale,
      alternatives: result.alternatives,
    });
  } catch (error) {
    console.error(`[Mobile AI Generate:${requestId}] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate workout" },
      { status: 500 }
    );
  }
}
