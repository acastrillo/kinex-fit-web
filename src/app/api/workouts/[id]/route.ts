import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBWorkouts } from "@/lib/dynamodb";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const exerciseSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  sets: z.number().int().min(1).max(100),
  reps: z.union([z.string().max(50), z.number().int().min(0).max(1000)]).nullable(),
  weight: z.union([z.string().max(50), z.number()]).nullable().optional(),
  restSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  duration: z.number().int().min(0).max(3600).nullable().optional(),
  setDetails: z
    .array(
      z.object({
        id: z.string().optional().nullable(),
        reps: z.union([z.string().max(50), z.number().int().min(0).max(1000)]).optional().nullable(),
        weight: z.union([z.string().max(50), z.number()]).optional().nullable(),
      }).passthrough()
    )
    .optional()
    .nullable(),
}).passthrough();

const amrapBlockSchema = z
  .object({
    id: z.string().min(1).max(200),
    label: z.string().max(200),
    timeLimit: z.number().int().min(1).max(14400),
    order: z.number().int().min(1).max(100),
    exercises: z.array(exerciseSchema).max(200),
    completed: z.boolean().optional(),
    completedAt: z.string().optional().nullable(),
    roundsCompleted: z.number().int().min(0).max(100000).optional(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .passthrough();

const emomBlockSchema = z
  .object({
    id: z.string().min(1).max(200),
    label: z.string().max(200),
    intervalSeconds: z.number().int().min(1).max(3600),
    order: z.number().int().min(1).max(100),
    exercises: z.array(exerciseSchema).max(200),
    completed: z.boolean().optional(),
    completedAt: z.string().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .passthrough();

const workoutUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    exercises: z.array(exerciseSchema).max(100).optional(),
    totalDuration: z.number().int().min(1).max(1440).optional(),
    difficulty: z.string().min(1).max(50).optional(),
    tags: z.array(z.string().min(1).max(50)).max(50).optional(),
    workoutType: z.string().min(1).max(50).optional(),
    structure: z.record(z.any()).optional(),
    amrapBlocks: z.array(amrapBlockSchema).optional().nullable(),
    emomBlocks: z.array(emomBlockSchema).optional().nullable(),
    timerConfig: z.record(z.any()).nullable().optional(),
    blockTimers: z.array(z.any()).optional(),
    aiEnhanced: z.boolean().optional(),
    aiNotes: z.array(z.string().max(500)).max(20).optional(),
    muscleGroups: z.array(z.string().min(1).max(50)).max(20).optional(),
  })
  .strip();

// GET /api/workouts/[id] - Get a specific workout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const workout = await dynamoDBWorkouts.get(userId, id);

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    return NextResponse.json({ workout });
  } catch (error) {
    console.error("Error fetching workout:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}

// PATCH /api/workouts/[id] - Update a workout
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const parsed = workoutUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      exercises,
      totalDuration,
      difficulty,
      tags,
      workoutType,
      structure,
      amrapBlocks,
      emomBlocks,
      timerConfig,
      blockTimers,
      aiEnhanced,
      aiNotes,
      muscleGroups,
    } = parsed.data;

    const hasUpdates = [
      title,
      description,
      exercises,
      totalDuration,
      difficulty,
      tags,
      workoutType,
      structure,
      amrapBlocks,
      emomBlocks,
      timerConfig,
      blockTimers,
      aiEnhanced,
      aiNotes,
      muscleGroups,
    ].some((value) => value !== undefined);

    if (!hasUpdates) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    // Transform exercises to match DynamoDBExercise type
    const transformExercise = (ex: any) => ({
      ...ex,
      reps: ex.reps ?? "", // Convert null reps to empty string
      weight: typeof ex.weight === 'number' ? String(ex.weight) : ex.weight, // Convert number to string
    });

    const transformedExercises = exercises?.map(transformExercise) as any; // Type assertion needed due to Zod passthrough

    const transformedAmrapBlocks = amrapBlocks?.map((block) => ({
      ...block,
      exercises: block.exercises.map(transformExercise),
      completedAt: block.completedAt ?? undefined,
      notes: block.notes ?? undefined,
    }));
    const transformedEmomBlocks = emomBlocks?.map((block) => ({
      ...block,
      exercises: block.exercises.map(transformExercise),
      completedAt: block.completedAt ?? undefined,
      notes: block.notes ?? undefined,
    }));

    await dynamoDBWorkouts.update(userId, id, {
      title,
      description: description ?? undefined, // Convert null to undefined for type safety
      exercises: transformedExercises ?? undefined, // Use transformed exercises
      totalDuration,
      difficulty,
      tags: tags ?? undefined, // Convert null to undefined
      workoutType: workoutType as 'standard' | 'emom' | 'amrap' | 'rounds' | 'ladder' | 'tabata' | undefined,
      structure,
      amrapBlocks: transformedAmrapBlocks,
      emomBlocks: transformedEmomBlocks,
      timerConfig: timerConfig as { params: any; aiGenerated?: boolean; reason?: string } | null | undefined,
      blockTimers,
      aiEnhanced,
      aiNotes, // Accepts null
      muscleGroups, // Accepts null
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating workout:", error);
    return NextResponse.json(
      { error: "Failed to update workout" },
      { status: 500 }
    );
  }
}

// DELETE /api/workouts/[id] - Delete a workout
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    await dynamoDBWorkouts.delete(userId, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout:", error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
