import { dynamoDBUsers, DynamoDBUser, getDynamoDb } from './dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { TrainingProfile, PersonalRecord } from './training-profile';

export type { DynamoDBUser };

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'spotter-users';

export interface UpdateSubscriptionInput {
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  lastReceiptValidation: string;
}

export interface UpdateOnboardingInput {
  experienceLevel: string | null;
  trainingDaysPerWeek: number | null;
  sessionDuration: number | null;
  equipment: string[];
  goals: string[];
  personalRecords: Array<{
    exerciseName: string;
    weight: number;
    unit: string;
    reps?: number;
  }>;
  onboardingCompleted: boolean;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<DynamoDBUser | null> {
  return dynamoDBUsers.get(userId);
}

/**
 * Update user subscription information
 */
export async function updateUserSubscription(
  userId: string,
  subscription: UpdateSubscriptionInput
): Promise<void> {
  await dynamoDBUsers.updateSubscription(userId, {
    tier: subscription.subscriptionTier as "free" | "core" | "pro" | "elite",
    status: subscription.subscriptionStatus as "active" | "inactive" | "trialing" | "canceled" | "past_due",
    endDate: subscription.subscriptionExpiresAt ? new Date(subscription.subscriptionExpiresAt) : null,
  });
}

/**
 * Update user quotas
 */
export async function incrementUserQuota(
  userId: string,
  quotaType: 'scan' | 'ai'
): Promise<void> {
  if (quotaType === 'scan') {
    await dynamoDBUsers.incrementOCRUsage(userId);
  } else {
    await dynamoDBUsers.incrementAIUsage(userId);
  }
}

/**
 * Delete user permanently
 */
export async function deleteUser(userId: string): Promise<void> {
  await dynamoDBUsers.delete(userId);
}

/**
 * Register device token for push notifications
 */
export async function registerDeviceToken(
  userId: string,
  deviceToken: string,
  platform: 'ios' | 'android'
): Promise<void> {
  const now = new Date().toISOString();
  await getDynamoDb().send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: `
        SET pushNotificationToken = :token,
            pushNotificationPlatform = :platform,
            pushNotificationRegisteredAt = :registeredAt,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeValues: {
        ':token': deviceToken,
        ':platform': platform,
        ':registeredAt': now,
        ':updatedAt': now,
      },
    })
  );
}

/**
 * Update user onboarding profile
 */
export async function updateUserOnboarding(
  userId: string,
  onboarding: UpdateOnboardingInput
): Promise<void> {
  // Convert personal records array to Record<string, PersonalRecord>
  const personalRecords: Record<string, PersonalRecord> = {};
  for (const pr of onboarding.personalRecords) {
    personalRecords[pr.exerciseName] = {
      weight: pr.weight,
      reps: pr.reps ?? 1,
      unit: (pr.unit as 'kg' | 'lbs') || 'lbs',
      date: new Date().toISOString().split('T')[0],
    };
  }

  const profile: TrainingProfile = {
    experience: (onboarding.experienceLevel as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
    trainingDays: onboarding.trainingDaysPerWeek ?? 3,
    sessionDuration: onboarding.sessionDuration ?? undefined,
    equipment: onboarding.equipment,
    goals: onboarding.goals,
    personalRecords,
    constraints: [],
    updatedAt: new Date().toISOString(),
  };

  await dynamoDBUsers.updateTrainingProfile(userId, profile);

  await dynamoDBUsers.update(userId, {
    onboardingCompleted: onboarding.onboardingCompleted,
    onboardingCompletedAt: new Date().toISOString(),
  });
}
