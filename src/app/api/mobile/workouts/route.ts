import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/mobile-auth';
import {
  createWorkout,
  listWorkouts,
  WorkoutInput
} from '@/lib/dynamodb-workouts';

export const runtime = "nodejs";

// GET /api/mobile/workouts - List user's workouts
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor') || undefined;

    // Fetch workouts from DynamoDB
    const result = await listWorkouts(userId, { limit, cursor });

    return NextResponse.json({
      workouts: result.workouts,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}

// POST /api/mobile/workouts - Create new workout
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const workoutInput: WorkoutInput = {
      ...body,
      userId,
    };

    // Validate required fields
    if (!workoutInput.title) {
      return NextResponse.json(
        { error: 'Workout title is required' },
        { status: 400 }
      );
    }

    // Create workout in DynamoDB
    const workout = await createWorkout(workoutInput);

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    console.error('Error creating workout:', error);
    return NextResponse.json(
      { error: 'Failed to create workout' },
      { status: 500 }
    );
  }
}
