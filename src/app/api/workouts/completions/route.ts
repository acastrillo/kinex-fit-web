import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkoutCompletions } from "@/lib/dynamodb";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const metricSchema = z
  .object({
    cardId: z.string().min(1).max(200),
    exerciseId: z.string().min(1).max(200),
    exerciseName: z.string().min(1).max(200),
    completed: z.boolean(),
    isRun: z.boolean(),
    targetReps: z.union([z.string().max(50), z.number()]).nullable().optional(),
    targetWeight: z.string().max(100).nullable().optional(),
    roundCompleted: z.number().int().min(0).max(1000).nullable().optional(),
    roundTotal: z.number().int().min(0).max(1000).nullable().optional(),
    reps: z.number().int().min(0).max(10000).nullable().optional(),
    weight: z.number().min(0).max(5000).nullable().optional(),
    weightUnit: z.enum(["lbs", "kg"]).nullable().optional(),
    distance: z.number().min(0).max(100000).nullable().optional(),
    distanceUnit: z.enum(["m", "km", "mi"]).nullable().optional(),
    timeSeconds: z.number().int().min(0).max(172800).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strip();

const prHighlightSchema = z
  .object({
    exerciseName: z.string().min(1).max(200),
    category: z.enum(["WEIGHT_REPS", "LONGEST_RUN_DISTANCE", "FASTEST_RUN"]),
    message: z.string().min(1).max(300),
    value: z.string().min(1).max(120),
  })
  .strip();

const completionCreateSchema = z
  .object({
    workoutId: z.string().min(1).max(200),
    completedAt: z.string().max(100),
    completedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    durationSeconds: z.number().int().min(0).max(86400).optional(),
    durationMinutes: z.number().int().min(0).max(1440).optional(),
    notes: z.string().max(2000).nullable().optional(),
    exerciseMetrics: z.array(metricSchema).max(500).optional(),
    prHighlights: z.array(prHighlightSchema).max(50).optional(),
  })
  .strip();

/**
 * GET /api/workouts/completions
 * List all workout completions for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const rateLimit = await checkRateLimit(userId, 'api:read');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
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
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const workoutId = searchParams.get("workoutId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let completions;

    // Query based on filters
    if (workoutId) {
      completions = await dynamoDBWorkoutCompletions.getForWorkout(userId, workoutId);
    } else if (startDate && endDate) {
      completions = await dynamoDBWorkoutCompletions.getByDateRange(userId, startDate, endDate);
    } else {
      completions = await dynamoDBWorkoutCompletions.list(userId, limit);
    }

    return NextResponse.json({ completions });
  } catch (error) {
    console.error("Error fetching workout completions:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout completions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workouts/completions
 * Create a new workout completion record
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const rateLimit = await checkRateLimit(userId, 'api:write');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
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
      );
    }

    // Parse request body
    const body = await req.json();
    const parsed = completionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }
    const {
      workoutId,
      completedAt,
      completedDate,
      durationSeconds,
      durationMinutes,
      notes,
      exerciseMetrics,
      prHighlights,
    } = parsed.data;

    // Generate completion ID (timestamp-based for sorting)
    const completionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the completion record
    const completion = await dynamoDBWorkoutCompletions.create(userId, {
      completionId,
      workoutId,
      completedAt,
      completedDate,
      durationSeconds,
      durationMinutes,
      notes,
      exerciseMetrics,
      prHighlights,
    });

    return NextResponse.json({
      success: true,
      completion,
    });
  } catch (error) {
    console.error("Error creating workout completion:", error);
    return NextResponse.json(
      { error: "Failed to create workout completion" },
      { status: 500 }
    );
  }
}
