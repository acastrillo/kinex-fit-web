/**
 * Mobile Sign-Out Endpoint
 *
 * POST /api/mobile/auth/signout
 *
 * Revokes the user's mobile refresh token, effectively signing them out
 * from all mobile devices. Requires a valid access token.
 *
 * Headers:
 * Authorization: Bearer <access_token>
 *
 * Response:
 * { "success": true }
 */

import { NextRequest } from "next/server";

import { dynamoDBUsers } from "@/lib/dynamodb";
import { verifyAccessToken } from "@/lib/mobile-jwt";
import {
  getMobileAuthTraceId,
  jsonWithMobileAuthTrace,
} from "@/lib/mobile-auth-trace";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const traceId = getMobileAuthTraceId(request);
  const logPrefix = `[Mobile Signout:${requestId}] trace=${traceId}`;

  try {
    console.log(`${logPrefix} Sign-out request received`);

    // Get access token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonWithMobileAuthTrace(
        { error: "Missing or invalid Authorization header" },
        { status: 401 },
        traceId
      );
    }

    const accessToken = authHeader.slice(7);

    // Verify access token
    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`${logPrefix} Token verification failed:`, error.message);

        return jsonWithMobileAuthTrace(
          {
            error: "Invalid access token",
            message: error.message,
          },
          { status: 401 },
          traceId
        );
      }
      throw error;
    }

    const userId = payload.sub;

    if (!userId) {
      return jsonWithMobileAuthTrace(
        { error: "Invalid token structure" },
        { status: 401 },
        traceId
      );
    }

    // Get user and revoke refresh token
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      // User not found - token is invalid
      return jsonWithMobileAuthTrace(
        { error: "User not found" },
        { status: 401 },
        traceId
      );
    }

    // Clear refresh token hash (revokes all mobile sessions)
    if (user.mobileRefreshTokenHash) {
      await dynamoDBUsers.upsert({
        ...user,
        mobileRefreshTokenHash: null,
      });

      console.log(`${logPrefix} Revoked mobile session for user ${userId}`);
    } else {
      console.log(`${logPrefix} No active mobile session for user ${userId}`);
    }

    return jsonWithMobileAuthTrace({ success: true }, undefined, traceId);
  } catch (error) {
    console.error(`${logPrefix} Unexpected error:`, error);
    return jsonWithMobileAuthTrace(
      { error: "Internal server error" },
      { status: 500 },
      traceId
    );
  }
}
