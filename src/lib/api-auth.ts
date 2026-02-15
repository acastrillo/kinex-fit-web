import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { headers } from "next/headers";
import { decode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth-options";

/**
 * Safely extracts and validates the authenticated user ID from the session.
 *
 * This utility replaces unsafe type assertions like `(session?.user as any)?.id`
 * with proper type safety and consistent error handling.
 *
 * @param request - The Next.js request object (optional, for future middleware use)
 * @returns Object with either userId or error response
 *
 * @example
 * ```typescript
 * const auth = await getAuthenticatedUserId();
 * if ('error' in auth) return auth.error;
 * const { userId } = auth;
 * ```
 */
export async function getAuthenticatedUserId(): Promise<{ userId: string } | { error: NextResponse }> {
  // Check for Bearer token first (mobile clients)
  const bearerResult = await extractBearerUserId();
  if (bearerResult) return bearerResult;

  // Fall back to NextAuth session (web clients)
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      ),
    };
  }

  return { userId };
}

/**
 * Extended version that returns the full session along with userId.
 * Useful when you need additional user information beyond just the ID.
 *
 * @returns Object with userId, session, or error response
 *
 * @example
 * ```typescript
 * const auth = await getAuthenticatedSession();
 * if ('error' in auth) return auth.error;
 * const { userId, session } = auth;
 * console.log(session.user.email);
 * ```
 */
export async function getAuthenticatedSession(): Promise<
  { userId: string; session: Session } | { error: NextResponse }
> {
  // Check for Bearer token first (mobile clients)
  const bearerResult = await extractBearerSession();
  if (bearerResult) return bearerResult;

  // Fall back to NextAuth session (web clients)
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  if (!userId || !session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      ),
    };
  }

  return { userId, session };
}

/**
 * Type guard to check if auth result contains an error.
 *
 * @example
 * ```typescript
 * const auth = await getAuthenticatedUserId();
 * if (isAuthError(auth)) return auth.error;
 * // TypeScript now knows auth has userId
 * ```
 */
export function isAuthError<T extends { error: NextResponse }>(
  auth: T | { userId: string }
): auth is T {
  return 'error' in auth;
}

/**
 * Extract userId from Bearer token in Authorization header.
 * Returns { userId } if valid token found, null otherwise (to fall through to session auth).
 */
async function extractBearerUserId(): Promise<{ userId: string } | null> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.substring(7);
    const decoded = await decode({ token, secret: process.env.AUTH_SECRET! });
    if (decoded?.id) {
      return { userId: decoded.id as string };
    }
  } catch {
    // Invalid token — fall through to session auth
  }
  return null;
}

/**
 * Extract userId and synthesize a session from Bearer token.
 * Returns { userId, session } if valid token found, null otherwise.
 */
async function extractBearerSession(): Promise<{ userId: string; session: Session } | null> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.substring(7);
    const decoded = await decode({ token, secret: process.env.AUTH_SECRET! });
    if (decoded?.id) {
      const session: Session = {
        user: {
          id: decoded.id as string,
          email: (decoded.email as string) || "",
          name: (decoded.name as string) || "",
          firstName: (decoded.firstName as string) || null,
          lastName: (decoded.lastName as string) || null,
          subscriptionTier: (decoded.subscriptionTier as string) || "free",
          provider: (decoded.provider as string) || "dev-credentials",
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      return { userId: decoded.id as string, session };
    }
  } catch {
    // Invalid token — fall through to session auth
  }
  return null;
}
