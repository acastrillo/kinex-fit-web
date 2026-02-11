import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/mobile-auth';
import {
  getWorkout,
  updateWorkout,
  deleteWorkout,
  WorkoutInput
} from '@/lib/dynamodb-workouts';

// GET /api/mobile/workouts/:id - Get specific workout
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workoutId = params.id;

    // Fetch workout from DynamoDB
    const workout = await getWorkout(userId, workoutId);

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (workout.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(workout);
  } catch (error) {
    console.error('Error fetching workout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout' },
      { status: 500 }
    );
  }
}

// PUT /api/mobile/workouts/:id - Update workout
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workoutId = params.id;

    // Verify workout exists and user owns it
    const existingWorkout = await getWorkout(userId, workoutId);
    if (!existingWorkout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    if (existingWorkout.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Check for conflicts (if updatedAt is provided)
    if (body.updatedAt && existingWorkout.updatedAt) {
      const clientTimestamp = new Date(body.updatedAt).getTime();
      const serverTimestamp = new Date(existingWorkout.updatedAt).getTime();

      if (clientTimestamp < serverTimestamp) {
        // Client data is older than server data - conflict
        return NextResponse.json(
          {
            error: 'Conflict',
            message: 'This workout was updated elsewhere. Please refresh and try again.',
            serverWorkout: existingWorkout,
          },
          { status: 409 }
        );
      }
    }

    const workoutInput: WorkoutInput = {
      ...body,
      userId,
      workoutId,
    };

    // Update workout in DynamoDB
    const updatedWorkout = await updateWorkout(userId, workoutId, workoutInput);

    return NextResponse.json(updatedWorkout);
  } catch (error) {
    console.error('Error updating workout:', error);
    return NextResponse.json(
      { error: 'Failed to update workout' },
      { status: 500 }
    );
  }
}

// DELETE /api/mobile/workouts/:id - Delete workout
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workoutId = params.id;

    // Verify workout exists and user owns it
    const existingWorkout = await getWorkout(userId, workoutId);
    if (!existingWorkout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    if (existingWorkout.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete workout from DynamoDB
    await deleteWorkout(userId, workoutId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout' },
      { status: 500 }
    );
  }
}
