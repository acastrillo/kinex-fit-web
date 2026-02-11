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

import { NextRequest, NextResponse } from "next/server";

import { dynamoDBUsers } from "@/lib/dynamodb";
import { verifyAccessToken } from "@/lib/mobile-jwt";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7);

    // Verify access token
    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(
          `[Mobile Signout:${requestId}] Token verification failed:`,
          error.message
        );

        return NextResponse.json(
          {
            error: "Invalid access token",
            message: error.message,
          },
          { status: 401 }
        );
      }
      throw error;
    }

    const userId = payload.sub;

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token structure" },
        { status: 401 }
      );
    }

    // Get user and revoke refresh token
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      // User not found - token is invalid
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Clear refresh token hash (revokes all mobile sessions)
    if (user.mobileRefreshTokenHash) {
      await dynamoDBUsers.upsert({
        ...user,
        mobileRefreshTokenHash: null,
      });

      console.log(
        `[Mobile Signout:${requestId}] Revoked mobile session for user ${userId}`
      );
    } else {
      console.log(
        `[Mobile Signout:${requestId}] No active mobile session for user ${userId}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[Mobile Signout:${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
