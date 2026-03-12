import { dynamoDBUsers, type DynamoDBUser } from "@/lib/dynamodb";
import {
  getAccessTokenTtlSeconds,
  hashRefreshTokenJti,
  signAccessToken,
  signRefreshToken,
} from "@/lib/mobile-jwt";
import { normalizeSubscriptionTier } from "@/lib/subscription-tiers";

import type {
  MobileAuthProvider,
  MobileAuthSuccessPayload,
} from "./credentials-auth-core";

export async function issueMobileAuthSession(
  user: DynamoDBUser,
  options: {
    provider: MobileAuthProvider;
    isNewUser: boolean;
  }
): Promise<MobileAuthSuccessPayload> {
  const signedInAt = new Date().toISOString();
  const tier = normalizeSubscriptionTier(user.subscriptionTier);
  const accessToken = await signAccessToken(
    user.id,
    user.email,
    tier,
    options.provider
  );
  const { token: refreshToken, jti } = await signRefreshToken(user.id);
  const refreshTokenHash = await hashRefreshTokenJti(jti);

  await dynamoDBUsers.upsert({
    ...user,
    mobileRefreshTokenHash: refreshTokenHash,
    mobileLastSignIn: signedInAt,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenTtlSeconds(),
    tokenType: "Bearer",
    isNewUser: options.isNewUser,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      subscriptionTier: tier,
      onboardingCompleted: user.onboardingCompleted ?? false,
    },
  };
}
