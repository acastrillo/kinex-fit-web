/**
 * Mobile API Authentication Helper
 *
 * Validates JWT access tokens for mobile API endpoints.
 * Use this instead of getAuthenticatedSession for mobile routes.
 */

import { NextRequest } from "next/server";
import {
  verifyAccessToken,
  type MobileAccessTokenPayload,
} from "./mobile-jwt";

export interface MobileAuthResult {
  userId: string;
  email: string;
  tier: "free" | "core" | "pro" | "elite";
  provider: "apple" | "google" | "facebook" | "credentials";
}

export interface MobileAuthError {
  error: string;
  code: "MISSING_TOKEN" | "INVALID_TOKEN" | "EXPIRED_TOKEN";
  status: number;
}

/**
 * Authenticate a mobile API request using JWT Bearer token
 *
 * @param request - Next.js request object
 * @returns Auth result with user info, or error
 *
 * Usage:
 * ```ts
 * const auth = await authenticateMobileRequest(request);
 * if ('error' in auth) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status });
 * }
 * const { userId, email, tier } = auth;
 * ```
 */
export async function authenticateMobileRequest(
  request: NextRequest
): Promise<MobileAuthResult | MobileAuthError> {
  // Extract Bearer token from Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return {
      error: "Missing Authorization header",
      code: "MISSING_TOKEN",
      status: 401,
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      error: "Invalid Authorization header format. Expected: Bearer <token>",
      code: "INVALID_TOKEN",
      status: 401,
    };
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    return {
      error: "Missing access token",
      code: "MISSING_TOKEN",
      status: 401,
    };
  }

  try {
    const payload = await verifyAccessToken(token);

    return {
      userId: payload.sub,
      email: payload.email,
      tier: payload.tier,
      provider: payload.provider,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        return {
          error: "Access token expired",
          code: "EXPIRED_TOKEN",
          status: 401,
        };
      }
    }

    return {
      error: "Invalid access token",
      code: "INVALID_TOKEN",
      status: 401,
    };
  }
}
