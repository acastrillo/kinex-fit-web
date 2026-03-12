import { randomUUID } from "crypto";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

export const credentialsSignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const credentialsSignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type CredentialsSignInInput = z.infer<typeof credentialsSignInSchema>;
export type CredentialsSignUpInput = z.infer<typeof credentialsSignUpSchema>;

export type MobileAuthProvider =
  | "apple"
  | "google"
  | "facebook"
  | "credentials";

export type SubscriptionTier = "free" | "core" | "pro" | "elite";

export interface CredentialsUserRecord {
  id: string;
  email: string;
  passwordHash?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: string | null;
  subscriptionTier?: SubscriptionTier;
  onboardingCompleted?: boolean;
  authProviders?: Record<
    string,
    {
      sub: string;
      linkedAt: string;
      email?: string;
    }
  >;
  mobileRefreshTokenHash?: string | null;
  mobileLastSignIn?: string | null;
  isDisabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MobileAuthSuccessPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  isNewUser: boolean;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    subscriptionTier: SubscriptionTier;
    onboardingCompleted: boolean;
  };
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface ApiRouteResult<TBody> {
  status: number;
  body: TBody;
  headers?: Record<string, string>;
}

export type CredentialsAuthFailureCode =
  | "RATE_LIMITED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED";

export type CredentialsRegistrationFailureCode =
  | "RATE_LIMITED"
  | "ACCOUNT_EXISTS";

export type CredentialsAuthOutcome =
  | {
      ok: true;
      user: CredentialsUserRecord;
    }
  | {
      ok: false;
      code: CredentialsAuthFailureCode;
      rateLimit?: RateLimitResult;
    };

export type CredentialsRegistrationOutcome =
  | {
      ok: true;
      created: true;
      user: CredentialsUserRecord;
    }
  | {
      ok: true;
      created: false;
      user: CredentialsUserRecord;
    }
  | {
      ok: false;
      code: CredentialsRegistrationFailureCode;
      rateLimit?: RateLimitResult;
    };

export interface CredentialsAuthDeps {
  getUserByEmail(email: string): Promise<CredentialsUserRecord | null>;
  comparePassword(password: string, passwordHash: string): Promise<boolean>;
}

export interface CredentialsRegistrationDeps {
  hashPassword(password: string): Promise<string>;
  getUserByEmail(email: string): Promise<CredentialsUserRecord | null>;
  createUser(user: CredentialsUserRecord): Promise<CredentialsUserRecord>;
  now?: () => string;
  generateUserId?: () => string;
}

interface RateLimitedDeps {
  checkRateLimit(
    identifier: string,
    operation: string
  ): Promise<RateLimitResult>;
}

interface MobileSessionDeps {
  issueMobileAuthSession(
    user: CredentialsUserRecord,
    options: { provider: "credentials"; isNewUser: boolean }
  ): Promise<MobileAuthSuccessPayload>;
}

export interface MobileCredentialsSignInDeps
  extends CredentialsAuthDeps,
    RateLimitedDeps,
    MobileSessionDeps {}

export interface MobileCredentialsSignUpDeps
  extends CredentialsRegistrationDeps,
    RateLimitedDeps,
    MobileSessionDeps {
  onUserCreated?(user: CredentialsUserRecord): Promise<void> | void;
}

export interface WebCredentialsSignUpDeps
  extends CredentialsRegistrationDeps,
    RateLimitedDeps {
  onUserCreated?(user: CredentialsUserRecord): Promise<void> | void;
}

export const WEB_SIGNUP_RESPONSE_MESSAGE =
  "If this email is available, your account has been created. Please sign in.";

function getRetryAfterSeconds(reset: number): number {
  return Math.max(0, Math.ceil((reset - Date.now()) / 1000));
}

function buildRateLimitHeaders(rateLimit: RateLimitResult): Record<string, string> {
  const retryAfter = getRetryAfterSeconds(rateLimit.reset);
  return {
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": rateLimit.reset.toString(),
    "Retry-After": retryAfter.toString(),
  };
}

function fireAndForgetUserCreated(
  onUserCreated: ((user: CredentialsUserRecord) => Promise<void> | void) | undefined,
  user: CredentialsUserRecord
) {
  if (!onUserCreated) {
    return;
  }

  try {
    void Promise.resolve(onUserCreated(user)).catch(() => undefined);
  } catch {
    // Signup alerts are best-effort and should not block auth flows.
  }
}

export async function authenticateCredentialsInput(
  input: CredentialsSignInInput,
  deps: CredentialsAuthDeps
): Promise<CredentialsAuthOutcome> {
  const user = await deps.getUserByEmail(input.email);

  if (!user?.passwordHash) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
    };
  }

  if (user.isDisabled) {
    return {
      ok: false,
      code: "ACCOUNT_DISABLED",
    };
  }

  const isValid = await deps.comparePassword(input.password, user.passwordHash);

  if (!isValid) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
    };
  }

  return {
    ok: true,
    user,
  };
}

export async function registerCredentialsInput(
  input: CredentialsSignUpInput,
  deps: CredentialsRegistrationDeps
): Promise<CredentialsRegistrationOutcome> {
  // Hash before the existence check to reduce timing differences.
  const passwordHash = await deps.hashPassword(input.password);
  const existingUser = await deps.getUserByEmail(input.email);

  if (existingUser) {
    return {
      ok: true,
      created: false,
      user: existingUser,
    };
  }

  const now = deps.now?.() ?? new Date().toISOString();
  const userId = deps.generateUserId?.() ?? randomUUID();

  const createdUser = await deps.createUser({
    id: userId,
    email: input.email,
    passwordHash,
    firstName: input.firstName || null,
    lastName: input.lastName || null,
    emailVerified: now,
    subscriptionTier: "free",
    onboardingCompleted: false,
    authProviders: {
      credentials: {
        sub: input.email,
        linkedAt: now,
        email: input.email,
      },
    },
  });

  return {
    ok: true,
    created: true,
    user: createdUser,
  };
}

export async function createMobileCredentialsSignInResult(
  params: {
    body: unknown;
    ip: string;
  },
  deps: MobileCredentialsSignInDeps
): Promise<
  ApiRouteResult<
    MobileAuthSuccessPayload | { error: string; message?: string; retryAfter?: number }
  >
> {
  const rateLimit = await deps.checkRateLimit(params.ip, "auth:mobile-signin");

  if (!rateLimit.success) {
    return {
      status: 429,
      body: {
        error: "Too many sign-in attempts",
        message: "Please wait before trying again",
        retryAfter: getRetryAfterSeconds(rateLimit.reset),
      },
      headers: {
        "Retry-After": getRetryAfterSeconds(rateLimit.reset).toString(),
      },
    };
  }

  const parsed = credentialsSignInSchema.safeParse(params.body);

  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: parsed.error.issues[0]?.message ?? "Invalid request body",
      },
    };
  }

  const auth = await authenticateCredentialsInput(parsed.data, deps);

  if (!auth.ok) {
    if (auth.code === "ACCOUNT_DISABLED") {
      return {
        status: 403,
        body: {
          error: "Account disabled",
          message: "This account has been disabled. Please contact support.",
        },
      };
    }

    return {
      status: 401,
      body: {
        error: "Authentication failed",
        message: "Invalid email or password",
      },
    };
  }

  const session = await deps.issueMobileAuthSession(auth.user, {
    provider: "credentials",
    isNewUser: false,
  });

  return {
    status: 200,
    body: session,
  };
}

export async function createMobileCredentialsSignUpResult(
  params: {
    body: unknown;
    ip: string;
  },
  deps: MobileCredentialsSignUpDeps
): Promise<
  ApiRouteResult<
    | MobileAuthSuccessPayload
    | {
        error: string;
        message?: string;
        retryAfter?: number;
        limit?: number;
        remaining?: number;
        reset?: number;
      }
  >
> {
  const rateLimit = await deps.checkRateLimit(params.ip, "auth:login");

  if (!rateLimit.success) {
    return {
      status: 429,
      body: {
        error: "Too many signup attempts",
        message: "Please wait before creating another account.",
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: rateLimit.reset,
        retryAfter: getRetryAfterSeconds(rateLimit.reset),
      },
      headers: buildRateLimitHeaders(rateLimit),
    };
  }

  const parsed = credentialsSignUpSchema.safeParse(params.body);

  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: parsed.error.issues[0]?.message ?? "Invalid request body",
      },
    };
  }

  const registration = await registerCredentialsInput(parsed.data, deps);

  if (!registration.ok) {
    return {
      status: 500,
      body: {
        error: "Failed to create account",
      },
    };
  }

  if (!registration.created) {
    return {
      status: 409,
      body: {
        error: "Account already exists",
        message: "An account with this email already exists. Please sign in instead.",
      },
    };
  }

  fireAndForgetUserCreated(deps.onUserCreated, registration.user);

  const session = await deps.issueMobileAuthSession(registration.user, {
    provider: "credentials",
    isNewUser: true,
  });

  return {
    status: 201,
    body: session,
  };
}

export async function createWebCredentialsSignUpResult(
  params: {
    body: unknown;
    ip: string;
  },
  deps: WebCredentialsSignUpDeps
): Promise<
  ApiRouteResult<
    | { success: true; message: string }
    | {
        error: string;
        message?: string;
        limit?: number;
        remaining?: number;
        reset?: number;
      }
  >
> {
  const rateLimit = await deps.checkRateLimit(params.ip, "auth:login");

  if (!rateLimit.success) {
    return {
      status: 429,
      body: {
        error: "Too many signup attempts",
        message: "Please wait before creating another account.",
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: rateLimit.reset,
      },
      headers: buildRateLimitHeaders(rateLimit),
    };
  }

  const parsed = credentialsSignUpSchema.safeParse(params.body);

  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: parsed.error.issues[0]?.message ?? "Invalid request body",
      },
    };
  }

  const registration = await registerCredentialsInput(parsed.data, deps);

  if (!registration.ok) {
    return {
      status: 500,
      body: {
        error: "Failed to create account",
      },
    };
  }

  if (registration.created) {
    fireAndForgetUserCreated(deps.onUserCreated, registration.user);
  }

  return {
    status: 201,
    body: {
      success: true,
      message: WEB_SIGNUP_RESPONSE_MESSAGE,
    },
  };
}
