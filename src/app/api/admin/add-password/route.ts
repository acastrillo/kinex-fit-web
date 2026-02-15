/**
 * Admin API to add password to OAuth users
 * POST /api/admin/add-password
 *
 * SECURITY: This endpoint should be protected in production!
 * For now, it's only enabled in development mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { maskEmail } from '@/lib/safe-logger';

export const runtime = 'nodejs';

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log('[AddPassword] Request received:', { email: maskEmail(body.email) });

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[AddPassword] Validation failed:', parsed.error.errors);
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Check if user exists
    console.log('[AddPassword] Looking up user:', maskEmail(email));
    const existingUser = await dynamoDBUsers.getByEmail(email);
    if (!existingUser) {
      console.error('[AddPassword] User not found:', maskEmail(email));
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[AddPassword] ✓ Found user:', existingUser.id);
    console.log('[AddPassword] Current passwordHash:', existingUser.passwordHash ? 'SET' : 'NOT SET');

    // Hash the password
    console.log('[AddPassword] Hashing password...');
    const passwordHash = await hash(password, 12);
    console.log('[AddPassword] ✓ Password hashed successfully');

    // Update user with password hash (preserve all existing data)
    console.log('[AddPassword] Updating user in DynamoDB...');
    await dynamoDBUsers.upsert({
      id: existingUser.id,
      email: existingUser.email,
      passwordHash,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      emailVerified: existingUser.emailVerified,
      subscriptionTier: existingUser.subscriptionTier,
      subscriptionStatus: existingUser.subscriptionStatus,
      subscriptionStartDate: existingUser.subscriptionStartDate,
      subscriptionEndDate: existingUser.subscriptionEndDate,
      trialEndsAt: existingUser.trialEndsAt,
      stripeCustomerId: existingUser.stripeCustomerId,
      stripeSubscriptionId: existingUser.stripeSubscriptionId,
      ocrQuotaUsed: existingUser.ocrQuotaUsed,
      ocrQuotaLimit: existingUser.ocrQuotaLimit,
      ocrQuotaResetDate: existingUser.ocrQuotaResetDate,
      scanQuotaUsed: existingUser.scanQuotaUsed,
      scanQuotaResetDate: existingUser.scanQuotaResetDate,
      instagramImportsUsed: existingUser.instagramImportsUsed,
      lastInstagramImportReset: existingUser.lastInstagramImportReset,
      workoutsSaved: existingUser.workoutsSaved,
      aiRequestsUsed: existingUser.aiRequestsUsed,
      aiRequestsLimit: existingUser.aiRequestsLimit,
      lastAiRequestReset: existingUser.lastAiRequestReset,
      trainingProfile: existingUser.trainingProfile,
      onboardingCompleted: existingUser.onboardingCompleted,
      onboardingSkipped: existingUser.onboardingSkipped,
      onboardingCompletedAt: existingUser.onboardingCompletedAt,
      isBeta: existingUser.isBeta,
      isDisabled: existingUser.isDisabled,
      disabledAt: existingUser.disabledAt ?? null,
      disabledBy: existingUser.disabledBy ?? null,
      disabledReason: existingUser.disabledReason ?? null,
    });

    console.log(`[AddPassword] ✓ Password added successfully for ${maskEmail(email)}`);

    return NextResponse.json({
      success: true,
      message: `Password added successfully. User ${maskEmail(email)} can now sign in with email/password.`,
      userId: existingUser.id,
    });

  } catch (error) {
    console.error('[AddPassword] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to add password',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
