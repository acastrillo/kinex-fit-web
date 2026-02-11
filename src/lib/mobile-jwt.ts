/**
 * Mobile JWT Token Service
 *
 * Handles JWT signing and verification for mobile app authentication.
 * Uses the jose library for secure JWT operations.
 *
 * Token Types:
 * - Access Token: Short-lived (15 min), used for API requests
 * - Refresh Token: Long-lived (30 days), used to get new access tokens
 *
 * CONFIGURATION:
 * - Set MOBILE_JWT_SECRET in .env (32+ character random string)
 */

import { SignJWT, jwtVerify, JWTPayload } from "jose";

// Token TTLs
const ACCESS_TOKEN_TTL = "15m"; // 15 minutes
const REFRESH_TOKEN_TTL = "30d"; // 30 days
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 900 seconds

// JWT configuration
const ISSUER = "https://api.kinex.fit";
const AUDIENCE = "com.kinex.fit"; // iOS bundle ID

/**
 * Access token payload structure
 */
export interface MobileAccessTokenPayload extends JWTPayload {
  sub: string; // User ID
  email: string;
  tier: "free" | "core" | "pro" | "elite";
  provider: "apple" | "google" | "facebook" | "credentials";
}

/**
 * Refresh token payload structure
 */
export interface MobileRefreshTokenPayload extends JWTPayload {
  sub: string; // User ID
  type: "refresh";
  jti: string; // Unique token ID for revocation tracking
}

/**
 * Get the JWT signing key from environment
 * @throws Error if MOBILE_JWT_SECRET is not set
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.MOBILE_JWT_SECRET;

  if (!secret) {
    throw new Error(
      "MOBILE_JWT_SECRET environment variable is not set. " +
        "Generate a secure random string (32+ characters) and add to .env"
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "MOBILE_JWT_SECRET must be at least 32 characters for security"
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Generate a unique token ID for tracking/revocation
 */
function generateJti(): string {
  return crypto.randomUUID();
}

/**
 * Sign an access token for mobile API authentication
 *
 * @param userId - User's DynamoDB ID
 * @param email - User's email address
 * @param tier - User's subscription tier
 * @param provider - Auth provider used for sign-in
 * @returns Signed JWT access token
 */
export async function signAccessToken(
  userId: string,
  email: string,
  tier: "free" | "core" | "pro" | "elite",
  provider: "apple" | "google" | "facebook" | "credentials"
): Promise<string> {
  const secret = getJwtSecret();

  const token = await new SignJWT({
    email,
    tier,
    provider,
  } as MobileAccessTokenPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setJti(generateJti())
    .sign(secret);

  return token;
}

/**
 * Sign a refresh token for obtaining new access tokens
 *
 * @param userId - User's DynamoDB ID
 * @returns Object with signed JWT refresh token and its unique ID (jti)
 */
export async function signRefreshToken(
  userId: string
): Promise<{ token: string; jti: string }> {
  const secret = getJwtSecret();
  const jti = generateJti();

  const token = await new SignJWT({
    type: "refresh",
  } as MobileRefreshTokenPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setJti(jti)
    .sign(secret);

  return { token, jti };
}

/**
 * Verify and decode an access token
 *
 * @param token - JWT access token string
 * @returns Decoded payload if valid
 * @throws Error if token is invalid, expired, or malformed
 */
export async function verifyAccessToken(
  token: string
): Promise<MobileAccessTokenPayload> {
  const secret = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    // Validate required fields
    if (!payload.sub || typeof payload.sub !== "string") {
      throw new Error("Token missing subject (user ID)");
    }

    // Check it's not a refresh token
    if ((payload as any).type === "refresh") {
      throw new Error("Cannot use refresh token as access token");
    }

    return payload as MobileAccessTokenPayload;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      if (error.message.includes("expired")) {
        throw new Error("Access token expired");
      }
      if (error.message.includes("signature")) {
        throw new Error("Invalid token signature");
      }
    }
    throw error;
  }
}

/**
 * Verify and decode a refresh token
 *
 * @param token - JWT refresh token string
 * @returns Decoded payload if valid
 * @throws Error if token is invalid, expired, or malformed
 */
export async function verifyRefreshToken(
  token: string
): Promise<MobileRefreshTokenPayload> {
  const secret = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    // Validate it's a refresh token
    if ((payload as any).type !== "refresh") {
      throw new Error("Not a refresh token");
    }

    // Validate required fields
    if (!payload.sub || typeof payload.sub !== "string") {
      throw new Error("Token missing subject (user ID)");
    }

    if (!payload.jti || typeof payload.jti !== "string") {
      throw new Error("Token missing JTI");
    }

    return payload as MobileRefreshTokenPayload;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        throw new Error("Refresh token expired");
      }
      if (error.message.includes("signature")) {
        throw new Error("Invalid token signature");
      }
    }
    throw error;
  }
}

/**
 * Get the access token TTL in seconds (for client-side expiration tracking)
 */
export function getAccessTokenTtlSeconds(): number {
  return ACCESS_TOKEN_TTL_SECONDS;
}

/**
 * Hash a refresh token JTI for storage in DynamoDB
 * This prevents token theft if database is compromised
 *
 * @param jti - The refresh token's unique ID
 * @returns SHA-256 hash of the JTI
 */
export async function hashRefreshTokenJti(jti: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(jti);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify a refresh token JTI against its stored hash
 *
 * @param jti - The refresh token's unique ID
 * @param storedHash - The hash stored in DynamoDB
 * @returns True if the JTI matches the stored hash
 */
export async function verifyRefreshTokenJti(
  jti: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashRefreshTokenJti(jti);
  return hash === storedHash;
}
