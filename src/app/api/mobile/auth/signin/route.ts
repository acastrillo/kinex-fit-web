/**
 * Mobile Sign-In Endpoint
 *
 * POST /api/mobile/auth/signin
 *
 * Validates identity tokens from Apple/Google/Facebook and issues JWT tokens
 * for mobile app authentication. Creates new users or links providers to
 * existing accounts based on email matching.
 *
 * Request Body:
 * {
 *   "provider": "apple" | "google" | "facebook",
 *   "identityToken": "...",
 *   "firstName": "...",  // Optional (Apple provides on first sign-in only)
 *   "lastName": "..."    // Optional
 * }
 *
 * Response:
 * {
 *   "accessToken": "...",
 *   "refreshToken": "...",
 *   "expiresIn": 900,
 *   "tokenType": "Bearer",
 *   "user": { ... }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { dynamoDBUsers, type DynamoDBUser } from "@/lib/dynamodb";
import {
  validateIdentityToken,
  IdentityValidationError,
} from "@/lib/identity-validators";
import {
  signAccessToken,
  signRefreshToken,
  hashRefreshTokenJti,
  getAccessTokenTtlSeconds,
} from "@/lib/mobile-jwt";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { maskEmail } from "@/lib/safe-logger";
import { normalizeSubscriptionTier } from "@/lib/subscription-tiers";

export const runtime = "nodejs";

// Request validation schema
const signinSchema = z.object({
  provider: z.enum(["apple", "google", "facebook"]),
  identityToken: z.string().min(1, "Identity token is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    // Rate limit by IP
    const ip = getRequestIp(request.headers) || "unknown";
    const rateLimit = await checkRateLimit(ip, "auth:mobile-signin");

    if (!rateLimit.success) {
      console.warn(
        `[Mobile Auth:${requestId}] Rate limit exceeded for IP ${ip}`
      );
      return NextResponse.json(
        {
          error: "Too many sign-in attempts",
          message: "Please wait before trying again",
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimit.reset - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = signinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { provider, identityToken, firstName, lastName } = parsed.data;

    console.log(
      `[Mobile Auth:${requestId}] Sign-in attempt with provider: ${provider}`
    );

    // Validate identity token with the provider
    let identity;
    try {
      identity = await validateIdentityToken(provider, identityToken, {
        firstName,
        lastName,
      });
    } catch (error) {
      if (error instanceof IdentityValidationError) {
        console.warn(
          `[Mobile Auth:${requestId}] Identity validation failed:`,
          error.message
        );

        const statusCode =
          error.code === "CONFIG_ERROR"
            ? 500
            : error.code === "NETWORK_ERROR"
              ? 502
              : 401;

        return NextResponse.json(
          {
            error: "Authentication failed",
            message: error.message,
            code: error.code,
          },
          { status: statusCode }
        );
      }
      throw error;
    }

    console.log(
      `[Mobile Auth:${requestId}] Identity validated: ${maskEmail(identity.email)} via ${provider}`
    );

    // Look up existing user by email
    let user = await dynamoDBUsers.getByEmail(identity.email);
    let isNewUser = false;

    if (user) {
      // Existing user - link this provider if not already linked
      console.log(
        `[Mobile Auth:${requestId}] Found existing user: ${user.id}`
      );

      const authProviders = user.authProviders || {};
      const providerKey = provider as keyof typeof authProviders;

      if (!authProviders[providerKey]) {
        // Link new provider to existing account
        const updatedProviders = {
          ...authProviders,
          [provider]: {
            sub: identity.providerId,
            linkedAt: new Date().toISOString(),
            email: identity.email,
          },
        };

        // Update user with linked provider and profile info
        await dynamoDBUsers.upsert({
          ...user,
          authProviders: updatedProviders,
          // Update name if provided and user doesn't have one
          firstName: user.firstName || identity.firstName || null,
          lastName: user.lastName || identity.lastName || null,
          mobileLastSignIn: new Date().toISOString(),
        });

        console.log(
          `[Mobile Auth:${requestId}] Linked ${provider} to existing user ${user.id}`
        );
      } else {
        // Provider already linked - just update last sign-in
        await dynamoDBUsers.upsert({
          ...user,
          mobileLastSignIn: new Date().toISOString(),
        });
      }

      // Refresh user data after update
      user = await dynamoDBUsers.get(user.id);
    } else {
      // New user - create account
      isNewUser = true;
      const userId = uuidv4();
      const now = new Date().toISOString();

      console.log(
        `[Mobile Auth:${requestId}] Creating new user: ${userId}`
      );

      const newUser: DynamoDBUser = {
        id: userId,
        email: identity.email,
        firstName: identity.firstName || null,
        lastName: identity.lastName || null,
        emailVerified: identity.emailVerified ? now : null,
        image: null,
        passwordHash: null,
        createdAt: now,
        updatedAt: now,

        // Subscription defaults (free tier)
        subscriptionTier: "free",
        subscriptionStatus: "active",
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        trialEndsAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,

        // Usage tracking defaults
        ocrQuotaUsed: 0,
        ocrQuotaLimit: 2,
        ocrQuotaResetDate: now,
        workoutsSaved: 0,

        // AI quota defaults
        aiRequestsUsed: 0,
        aiRequestsLimit: 0,
        lastAiRequestReset: now,

        // Auth providers
        authProviders: {
          [provider]: {
            sub: identity.providerId,
            linkedAt: now,
            email: identity.email,
          },
        },

        // Mobile session
        mobileLastSignIn: now,

        // Onboarding
        onboardingCompleted: false,
        onboardingSkipped: false,
      };

      try {
        await dynamoDBUsers.upsert(newUser, {
          // Prevent race condition if another request creates user with same ID
          ConditionExpression: "attribute_not_exists(#id)",
          ExpressionAttributeNames: { "#id": "id" },
        });
      } catch (error: any) {
        if (error.name === "ConditionalCheckFailedException") {
          // Race condition - user was created by another request
          // Try to fetch the user that was created
          user = await dynamoDBUsers.getByEmail(identity.email);
          if (user) {
            console.log(
              `[Mobile Auth:${requestId}] Race condition - using existing user ${user.id}`
            );
            isNewUser = false;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      if (isNewUser) {
        user = newUser;
      }
    }

    if (!user) {
      console.error(`[Mobile Auth:${requestId}] Failed to create/find user`);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Generate tokens
    const tier = normalizeSubscriptionTier(user.subscriptionTier);
    const accessToken = await signAccessToken(
      user.id,
      user.email,
      tier,
      provider
    );
    const { token: refreshToken, jti } = await signRefreshToken(user.id);

    // Store hashed refresh token JTI for validation
    const refreshTokenHash = await hashRefreshTokenJti(jti);
    await dynamoDBUsers.upsert({
      ...user,
      mobileRefreshTokenHash: refreshTokenHash,
    });

    console.log(
      `[Mobile Auth:${requestId}] ${isNewUser ? "Created new user" : "Signed in existing user"}: ${user.id}`
    );

    // Return tokens and user profile
    return NextResponse.json(
      {
        accessToken,
        refreshToken,
        expiresIn: getAccessTokenTtlSeconds(),
        tokenType: "Bearer",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: tier,
          onboardingCompleted: user.onboardingCompleted || false,
        },
        isNewUser,
      },
      { status: isNewUser ? 201 : 200 }
    );
  } catch (error) {
    console.error(`[Mobile Auth:${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
