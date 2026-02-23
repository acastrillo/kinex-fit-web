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

import { NextRequest } from "next/server";
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
import {
  getMobileAuthTraceId,
  jsonWithMobileAuthTrace,
} from "@/lib/mobile-auth-trace";

export const runtime = "nodejs";

// Request validation schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const traceId = getMobileAuthTraceId(request);
  const logPrefix = `[Mobile Refresh:${requestId}] trace=${traceId}`;

  try {
    console.log(`${logPrefix} Refresh request received`);

    // Rate limit by IP
    const ip = getRequestIp(request.headers) || "unknown";
    const rateLimit = await checkRateLimit(ip, "auth:mobile-refresh");

    if (!rateLimit.success) {
      console.warn(`${logPrefix} Rate limit exceeded for IP ${ip}`);
      return jsonWithMobileAuthTrace(
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
        },
        traceId
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = refreshSchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithMobileAuthTrace(
        { error: parsed.error.errors[0].message },
        { status: 400 },
        traceId
      );
    }

    const { refreshToken } = parsed.data;

    // Verify refresh token signature and expiration
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`${logPrefix} Token verification failed:`, error.message);

        return jsonWithMobileAuthTrace(
          {
            error: "Invalid refresh token",
            message: error.message,
            code: error.message.includes("expired")
              ? "TOKEN_EXPIRED"
              : "INVALID_TOKEN",
          },
          { status: 401 },
          traceId
        );
      }
      throw error;
    }

    const userId = payload.sub;
    const jti = payload.jti;

    if (!userId || !jti) {
      return jsonWithMobileAuthTrace(
        { error: "Invalid refresh token structure" },
        { status: 401 },
        traceId
      );
    }

    // Get user and verify the token's JTI matches what we have stored
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      console.warn(`${logPrefix} User not found: ${userId}`);
      return jsonWithMobileAuthTrace(
        { error: "User not found" },
        { status: 401 },
        traceId
      );
    }

    // Verify the refresh token JTI matches the stored hash
    if (!user.mobileRefreshTokenHash) {
      console.warn(`${logPrefix} No refresh token stored for user ${userId}`);
      return jsonWithMobileAuthTrace(
        {
          error: "Session expired",
          message: "Please sign in again",
          code: "SESSION_EXPIRED",
        },
        { status: 401 },
        traceId
      );
    }

    const jtiValid = await verifyRefreshTokenJti(jti, user.mobileRefreshTokenHash);

    if (!jtiValid) {
      // Token JTI doesn't match - either stolen token or already rotated
      console.warn(
        `${logPrefix} Refresh token JTI mismatch for user ${userId} - possible token reuse`
      );

      // Invalidate all mobile sessions for security (potential token theft)
      await dynamoDBUsers.upsert({
        ...user,
        mobileRefreshTokenHash: null,
      });

      return jsonWithMobileAuthTrace(
        {
          error: "Invalid refresh token",
          message: "This token has already been used or revoked. Please sign in again.",
          code: "TOKEN_REUSED",
        },
        { status: 401 },
        traceId
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

    console.log(`${logPrefix} Tokens refreshed for user ${userId}`);

    return jsonWithMobileAuthTrace(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: getAccessTokenTtlSeconds(),
        tokenType: "Bearer",
      },
      undefined,
      traceId
    );
  } catch (error) {
    console.error(`${logPrefix} Unexpected error:`, error);
    return jsonWithMobileAuthTrace(
      { error: "Internal server error" },
      { status: 500 },
      traceId
    );
  }
}
