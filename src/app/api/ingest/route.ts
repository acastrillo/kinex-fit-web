import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuthenticatedUserId } from "@/lib/api-auth";
import { parseWorkoutContentWithFallback } from "@/lib/workout-parser";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  applyGuestSessionCookie,
  getOrCreateGuestSession,
} from "@/lib/guest-session";
import { z } from "zod";

const ingestSchema = z
  .object({
    caption: z.string().min(1).max(20000),
  })
  .strip();

export async function POST(req: NextRequest){
  try {
    const auth = await getOptionalAuthenticatedUserId();
    const guestSession = auth ? null : await getOrCreateGuestSession(req.headers);
    const actorId = auth?.userId ?? guestSession!.actorId;
    const rateLimitId = auth?.userId ?? guestSession!.rateLimitId;
    const respond = (response: NextResponse) =>
      guestSession ? applyGuestSessionCookie(response, guestSession) : response;

    const rateLimit = await checkRateLimit(rateLimitId, 'api:write');
    if (!rateLimit.success) {
      return respond(NextResponse.json(
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
      ));
    }

    const body = await req.json();
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) {
      return respond(NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request body" },
        { status: 400 }
      ));
    }
    const { caption } = parsed.data;

    // Use smart workout parser
    const parsedWorkout = await parseWorkoutContentWithFallback(caption, {
      context: { userId: actorId },
    });

    // Create backward-compatible rows format
    const rows = parsedWorkout.exercises.map(exercise => ({
      id: exercise.id,
      movement: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      notes: exercise.notes
    }));

    // Estimate duration based on workout structure
    let estimatedDuration = 20; // default in minutes
    switch (parsedWorkout.structure.type) {
      case 'ladder':
        estimatedDuration = (parsedWorkout.structure.values?.length || 1) * parsedWorkout.exercises.length * 2;
        break;
      case 'rounds':
        estimatedDuration = (parsedWorkout.structure.rounds || 1) * parsedWorkout.exercises.length * 2;
        break;
      case 'amrap':
        if (parsedWorkout.structure.timeLimit) {
          estimatedDuration = Math.max(1, Math.ceil(parsedWorkout.structure.timeLimit / 60));
        }
        break;
      case 'emom': {
        const totalTime = parsedWorkout.structure.totalTime
          || (parsedWorkout.structure.rounds && parsedWorkout.structure.timePerRound
            ? parsedWorkout.structure.rounds * parsedWorkout.structure.timePerRound
            : undefined);
        if (totalTime) {
          estimatedDuration = Math.max(1, Math.ceil(totalTime / 60));
        }
        break;
      }
      case 'tabata':
        estimatedDuration = 8 * 0.5; // 8 rounds of 30s each
        break;
      default:
        estimatedDuration = parsedWorkout.exercises.length * 3;
    }

    return respond(NextResponse.json({
      title: parsedWorkout.title,
      workoutType: parsedWorkout.workoutType,
      exercises: parsedWorkout.exercises,
      rows,
      summary: parsedWorkout.summary,
      breakdown: parsedWorkout.breakdown,
      structure: parsedWorkout.structure,
      amrapBlocks: parsedWorkout.amrapBlocks,
      emomBlocks: parsedWorkout.emomBlocks,
      usedLLM: parsedWorkout.usedLLM,
      workoutV1: {
        name: parsedWorkout.title || `Smart Parsed Workout (${parsedWorkout.structure.type})`,
        totalDuration: estimatedDuration,
        difficulty: parsedWorkout.exercises.length > 4 ? 'hard' : 'moderate',
        tags: ['smart-parsed', parsedWorkout.structure.type]
      }
    }));

  } catch (error) {
    console.error('Error processing workout:', error);
    return NextResponse.json(
      { error: "Failed to process workout" },
      { status: 500 }
    );
  }
}
