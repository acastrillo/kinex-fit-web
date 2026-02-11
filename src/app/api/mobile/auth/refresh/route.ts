/**
 * Mobile Token Refresh Endpoint
 *
 * POST /api/mobile/auth/refresh
 *
 * Exchanges a valid refresh token for new access and refresh tokens.
 * Implements token rotation - each refresh invalidates the old refresh token.
 *
 * Request Body:
 * {
 *   "refreshToken": "..."
 * }
 *
 * Response:
 * {
 *   "accessToken": "...",
 *   "refreshToken": "...",
 *   "expiresIn": 900,
 *   "tokenType": "Bearer"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { dynamoDBUsers } from "@/lib/dynamodb";
import {
  verifyRefreshToken,
  verifyRefreshTokenJti,
  signAccessToken,
  signRefreshToken,
  hashRefreshTokenJti,
  getAccessTokenTtlSeconds,
} from "@/lib/mobile-jwt";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { normalizeSubscriptionTier } from "@/lib/subscription-tiers";

export const runtime = "nodejs";

// Request validation schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    // Rate limit by IP
    const ip = getRequestIp(request.headers) || "unknown";
    const rateLimit = await checkRateLimit(ip, "auth:mobile-refresh");

    if (!rateLimit.success) {
      console.warn(
        `[Mobile Refresh:${requestId}] Rate limit exceeded for IP ${ip}`
      );
      return NextResponse.json(
        {
          error: "Too many refresh attempts",
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
    const parsed = refreshSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { refreshToken } = parsed.data;

    // Verify refresh token signature and expiration
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(
          `[Mobile Refresh:${requestId}] Token verification failed:`,
          error.message
        );

        return NextResponse.json(
          {
            error: "Invalid refresh token",
            message: error.message,
            code: error.message.includes("expired")
              ? "TOKEN_EXPIRED"
              : "INVALID_TOKEN",
          },
          { status: 401 }
        );
      }
      throw error;
    }

    const userId = payload.sub;
    const jti = payload.jti;

    if (!userId || !jti) {
      return NextResponse.json(
        { error: "Invalid refresh token structure" },
        { status: 401 }
      );
    }

    // Get user and verify the token's JTI matches what we have stored
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      console.warn(
        `[Mobile Refresh:${requestId}] User not found: ${userId}`
      );
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Verify the refresh token JTI matches the stored hash
    if (!user.mobileRefreshTokenHash) {
      console.warn(
        `[Mobile Refresh:${requestId}] No refresh token stored for user ${userId}`
      );
      return NextResponse.json(
        {
          error: "Session expired",
          message: "Please sign in again",
          code: "SESSION_EXPIRED",
        },
        { status: 401 }
      );
    }

    const jtiValid = await verifyRefreshTokenJti(jti, user.mobileRefreshTokenHash);

    if (!jtiValid) {
      // Token JTI doesn't match - either stolen token or already rotated
      console.warn(
        `[Mobile Refresh:${requestId}] Refresh token JTI mismatch for user ${userId} - possible token reuse`
      );

      // Invalidate all mobile sessions for security (potential token theft)
      await dynamoDBUsers.upsert({
        ...user,
        mobileRefreshTokenHash: null,
      });

      return NextResponse.json(
        {
          error: "Invalid refresh token",
          message: "This token has already been used or revoked. Please sign in again.",
          code: "TOKEN_REUSED",
        },
        { status: 401 }
      );
    }

    // Generate new tokens (rotation)
    const tier = normalizeSubscriptionTier(user.subscriptionTier);

    // Determine provider from authProviders (use most recently linked)
    let provider: "apple" | "google" | "facebook" | "credentials" = "credentials";
    const providers = user.authProviders || {};
    let latestLinkedAt = "";

    for (const [key, value] of Object.entries(providers)) {
      if (value && value.linkedAt && value.linkedAt > latestLinkedAt) {
        latestLinkedAt = value.linkedAt;
        provider = key as typeof provider;
      }
    }

    const newAccessToken = await signAccessToken(
      user.id,
      user.email,
      tier,
      provider
    );
    const { token: newRefreshToken, jti: newJti } = await signRefreshToken(
      user.id
    );

    // Store new refresh token hash (invalidates old token)
    const newRefreshTokenHash = await hashRefreshTokenJti(newJti);
    await dynamoDBUsers.upsert({
      ...user,
      mobileRefreshTokenHash: newRefreshTokenHash,
      mobileLastSignIn: new Date().toISOString(),
    });

    console.log(
      `[Mobile Refresh:${requestId}] Tokens refreshed for user ${userId}`
    );

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: getAccessTokenTtlSeconds(),
      tokenType: "Bearer",
    });
  } catch (error) {
    console.error(`[Mobile Refresh:${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
