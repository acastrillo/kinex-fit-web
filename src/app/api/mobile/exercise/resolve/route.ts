import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/mobile-auth";
import { resolveExerciseNames } from "@/lib/exercise-resolver";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

export const runtime = "nodejs";

const exerciseNamesSchema = z.array(z.string().trim().min(1).max(200)).min(1).max(50);
const requestSchema = z.union([
  exerciseNamesSchema,
  z
    .object({
      exerciseNames: exerciseNamesSchema.optional(),
      names: exerciseNamesSchema.optional(),
      rawNames: exerciseNamesSchema.optional(),
      exercises: exerciseNamesSchema.optional(),
    })
    .refine(
      (value) =>
        Array.isArray(value.exerciseNames) ||
        Array.isArray(value.names) ||
        Array.isArray(value.rawNames) ||
        Array.isArray(value.exercises),
      { message: "Expected an array of exercise names" }
    ),
]);

function extractExerciseNames(body: z.infer<typeof requestSchema>): string[] {
  if (Array.isArray(body)) {
    return body;
  }

  return body.exerciseNames || body.names || body.rawNames || body.exercises || [];
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const exerciseNames = extractExerciseNames(parsed.data);
    const rateLimit = await checkRateLimit(
      userId ?? getRequestIp(request.headers),
      userId ? "api:exercise-resolve" : "api:guest-import"
    );

    if (!rateLimit.success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        {
          error: "Too many exercise resolution requests",
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.reset.toString(),
            "Retry-After": retryAfterSeconds.toString(),
          },
        }
      );
    }

    const exercises = await resolveExerciseNames(exerciseNames, {
      actorId: userId ?? "guest",
      subscriptionTier: userId ? undefined : "guest",
    });

    return NextResponse.json({ exercises });
  } catch (error) {
    console.error("[Mobile Exercise Resolve] Error:", error);
    return NextResponse.json(
      { error: "Failed to resolve exercises" },
      { status: 500 }
    );
  }
}
