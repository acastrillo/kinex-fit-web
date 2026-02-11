import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/mobile-auth';
import { updateUserOnboarding } from '@/lib/dynamodb-users';

/**
 * POST /api/mobile/user/onboarding
 *
 * Save user onboarding profile and preferences
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const userId = await getAuthenticatedUserId(request);

    // Parse request body
    const body = await request.json();
    const {
      experienceLevel,
      trainingDaysPerWeek,
      sessionDuration,
      equipment,
      goals,
      personalRecords,
    } = body;

    // Save onboarding data to user profile
    await updateUserOnboarding(userId, {
      experienceLevel: experienceLevel || null,
      trainingDaysPerWeek: trainingDaysPerWeek || null,
      sessionDuration: sessionDuration || null,
      equipment: equipment || [],
      goals: goals || [],
      personalRecords: personalRecords || [],
      onboardingCompleted: true,
    });

    console.log(`Onboarding completed for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Onboarding data saved successfully',
    });
  } catch (error) {
    console.error('Onboarding save error:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding data' },
      { status: 500 }
    );
  }
}
