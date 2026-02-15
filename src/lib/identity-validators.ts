/**
 * Identity Token Validators for Mobile OAuth Sign-In
 *
 * Validates identity tokens from Apple, Google, and Facebook providers.
 * Used by the mobile signin route to authenticate users.
 *
 * - Apple & Google: JWT verification via JWKS (jose library)
 * - Facebook: Opaque token validation via Graph API
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationErrorCode =
  | "CONFIG_ERROR"
  | "NETWORK_ERROR"
  | "INVALID_TOKEN";

export interface IdentityValidationResult {
  providerId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified: boolean;
}

export class IdentityValidationError extends Error {
  code: ValidationErrorCode;

  constructor(message: string, code: ValidationErrorCode) {
    super(message);
    this.name = "IdentityValidationError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// JWKS caches (module-level singletons — jose handles key rotation internally)
// ---------------------------------------------------------------------------

const appleJWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

const googleJWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function validateIdentityToken(
  provider: "apple" | "google" | "facebook",
  identityToken: string,
  options?: { firstName?: string; lastName?: string }
): Promise<IdentityValidationResult> {
  switch (provider) {
    case "apple":
      return validateAppleToken(identityToken, options);
    case "google":
      return validateGoogleToken(identityToken, options);
    case "facebook":
      return validateFacebookToken(identityToken, options);
    default:
      throw new IdentityValidationError(
        `Unsupported provider: ${provider}`,
        "INVALID_TOKEN"
      );
  }
}

// ---------------------------------------------------------------------------
// Apple
// ---------------------------------------------------------------------------

async function validateAppleToken(
  token: string,
  options?: { firstName?: string; lastName?: string }
): Promise<IdentityValidationResult> {
  const audience = process.env.APPLE_BUNDLE_ID || "com.kinex.fit";

  try {
    const { payload } = await jwtVerify(token, appleJWKS, {
      issuer: "https://appleid.apple.com",
      audience,
    });

    const sub = payload.sub;
    const email = payload.email as string | undefined;

    if (!sub || !email) {
      throw new IdentityValidationError(
        "Apple token missing required claims (sub, email)",
        "INVALID_TOKEN"
      );
    }

    return {
      providerId: sub,
      email,
      // Apple only sends name on first sign-in; use options as fallback
      firstName: options?.firstName || null,
      lastName: options?.lastName || null,
      emailVerified: (payload.email_verified as boolean) ?? false,
    };
  } catch (error) {
    if (error instanceof IdentityValidationError) throw error;
    throw new IdentityValidationError(
      `Apple token validation failed: ${error instanceof Error ? error.message : "unknown error"}`,
      "INVALID_TOKEN"
    );
  }
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

async function validateGoogleToken(
  token: string,
  options?: { firstName?: string; lastName?: string }
): Promise<IdentityValidationResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new IdentityValidationError(
      "GOOGLE_CLIENT_ID environment variable is not set",
      "CONFIG_ERROR"
    );
  }

  try {
    const { payload } = await jwtVerify(token, googleJWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });

    const sub = payload.sub;
    const email = payload.email as string | undefined;

    if (!sub || !email) {
      throw new IdentityValidationError(
        "Google token missing required claims (sub, email)",
        "INVALID_TOKEN"
      );
    }

    return {
      providerId: sub,
      email,
      firstName:
        (payload.given_name as string) || options?.firstName || null,
      lastName:
        (payload.family_name as string) || options?.lastName || null,
      emailVerified: (payload.email_verified as boolean) ?? false,
    };
  } catch (error) {
    if (error instanceof IdentityValidationError) throw error;
    throw new IdentityValidationError(
      `Google token validation failed: ${error instanceof Error ? error.message : "unknown error"}`,
      "INVALID_TOKEN"
    );
  }
}

// ---------------------------------------------------------------------------
// Facebook
// ---------------------------------------------------------------------------

async function validateFacebookToken(
  token: string,
  options?: { firstName?: string; lastName?: string }
): Promise<IdentityValidationResult> {
  const appId = process.env.FACEBOOK_CLIENT_ID;
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET;

  if (!appId || !appSecret) {
    throw new IdentityValidationError(
      "FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET must be set",
      "CONFIG_ERROR"
    );
  }

  // Step 1: Debug/validate the access token
  let debugData: { data?: { is_valid?: boolean; app_id?: string; user_id?: string } };
  try {
    const debugUrl = new URL("https://graph.facebook.com/debug_token");
    debugUrl.searchParams.set("input_token", token);
    debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);

    const debugRes = await fetch(debugUrl.toString());
    if (!debugRes.ok) {
      throw new Error(`HTTP ${debugRes.status}`);
    }
    debugData = await debugRes.json();
  } catch (error) {
    if (error instanceof IdentityValidationError) throw error;
    throw new IdentityValidationError(
      `Failed to reach Facebook API: ${error instanceof Error ? error.message : "unknown error"}`,
      "NETWORK_ERROR"
    );
  }

  if (!debugData.data?.is_valid) {
    throw new IdentityValidationError(
      "Facebook token is invalid or expired",
      "INVALID_TOKEN"
    );
  }

  if (debugData.data.app_id !== appId) {
    throw new IdentityValidationError(
      "Facebook token was not issued for this application",
      "INVALID_TOKEN"
    );
  }

  // Step 2: Fetch user profile
  let profile: { id?: string; email?: string; first_name?: string; last_name?: string };
  try {
    const profileUrl = new URL("https://graph.facebook.com/me");
    profileUrl.searchParams.set(
      "fields",
      "id,email,first_name,last_name"
    );
    profileUrl.searchParams.set("access_token", token);

    const profileRes = await fetch(profileUrl.toString());
    if (!profileRes.ok) {
      throw new Error(`HTTP ${profileRes.status}`);
    }
    profile = await profileRes.json();
  } catch (error) {
    if (error instanceof IdentityValidationError) throw error;
    throw new IdentityValidationError(
      `Failed to fetch Facebook profile: ${error instanceof Error ? error.message : "unknown error"}`,
      "NETWORK_ERROR"
    );
  }

  if (!profile.id) {
    throw new IdentityValidationError(
      "Facebook profile missing user ID",
      "INVALID_TOKEN"
    );
  }

  if (!profile.email) {
    throw new IdentityValidationError(
      "Facebook account has no email address. Ensure 'email' permission is granted.",
      "INVALID_TOKEN"
    );
  }

  return {
    providerId: profile.id,
    email: profile.email,
    firstName: profile.first_name || options?.firstName || null,
    lastName: profile.last_name || options?.lastName || null,
    // Facebook emails from Graph API are verified
    emailVerified: true,
  };
}
