import { compare, hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import {
  authenticateCredentialsInput,
  createMobileCredentialsSignInResult,
  createMobileCredentialsSignUpResult,
  createWebCredentialsSignUpResult,
  type CredentialsUserRecord,
} from "@/lib/credentials-auth-core";
import { dynamoDBUsers, type DynamoDBUser } from "@/lib/dynamodb";
import { sendSignupAlert } from "@/lib/email-service";
import { issueMobileAuthSession } from "@/lib/mobile-auth-session";
import {
  getMobileAuthTraceId,
  jsonWithMobileAuthTrace,
} from "@/lib/mobile-auth-trace";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

function withJsonBodyError(traceId?: string) {
  const body = { error: "Invalid JSON body" };
  if (traceId) {
    return jsonWithMobileAuthTrace(body, { status: 400 }, traceId);
  }
  return NextResponse.json(body, { status: 400 });
}

function getRealIp(headers: Headers | Record<string, string | string[] | undefined> | null | undefined) {
  return getRequestIp(headers) || "unknown";
}

function asDynamoUser(user: CredentialsUserRecord): DynamoDBUser {
  return user as unknown as DynamoDBUser;
}

function createUser(user: CredentialsUserRecord): Promise<DynamoDBUser> {
  return dynamoDBUsers.upsert(user);
}

function sendSignupAlertForUser(user: CredentialsUserRecord) {
  return sendSignupAlert({
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    id: user.id,
    provider: "credentials",
    createdAt:
      typeof user.createdAt === "string"
        ? user.createdAt
        : new Date().toISOString(),
  });
}

export async function authenticateCredentialsUser(params: {
  email: string;
  password: string;
  headers?: Headers | Record<string, string | string[] | undefined> | null;
  rateLimitOperation?: "auth:login" | "auth:mobile-signin";
}) {
  const ip = getRealIp(params.headers);
  const rateLimit = await checkRateLimit(
    ip,
    params.rateLimitOperation ?? "auth:login"
  );

  if (!rateLimit.success) {
    return {
      ok: false as const,
      status: 429,
      code: "RATE_LIMITED" as const,
      retryAfter: Math.max(0, Math.ceil((rateLimit.reset - Date.now()) / 1000)),
    };
  }

  const auth = await authenticateCredentialsInput(
    {
      email: params.email,
      password: params.password,
    },
    {
      getUserByEmail: dynamoDBUsers.getByEmail,
      comparePassword: compare,
    }
  );

  if (!auth.ok) {
    return {
      ok: false as const,
      status: auth.code === "ACCOUNT_DISABLED" ? 403 : 401,
      code: auth.code,
    };
  }

  return {
    ok: true as const,
    user: auth.user as DynamoDBUser,
  };
}

export async function handleMobileCredentialsSignIn(request: NextRequest) {
  const traceId = getMobileAuthTraceId(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withJsonBodyError(traceId);
  }

  const result = await createMobileCredentialsSignInResult(
    {
      body,
      ip: getRealIp(request.headers),
    },
    {
      checkRateLimit,
      getUserByEmail: dynamoDBUsers.getByEmail,
      comparePassword: compare,
      issueMobileAuthSession: (user, options) =>
        issueMobileAuthSession(asDynamoUser(user), options),
    }
  );

  return jsonWithMobileAuthTrace(
    result.body,
    {
      status: result.status,
      headers: result.headers,
    },
    traceId
  );
}

export async function handleMobileCredentialsSignup(request: NextRequest) {
  const traceId = getMobileAuthTraceId(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withJsonBodyError(traceId);
  }

  const result = await createMobileCredentialsSignUpResult(
    {
      body,
      ip: getRealIp(request.headers),
    },
    {
      checkRateLimit,
      hashPassword: (password) => hash(password, 12),
      getUserByEmail: dynamoDBUsers.getByEmail,
      createUser,
      issueMobileAuthSession: (user, options) =>
        issueMobileAuthSession(asDynamoUser(user), options),
      onUserCreated: sendSignupAlertForUser,
    }
  );

  return jsonWithMobileAuthTrace(
    result.body,
    {
      status: result.status,
      headers: result.headers,
    },
    traceId
  );
}

export async function handleWebCredentialsSignup(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withJsonBodyError();
  }

  const result = await createWebCredentialsSignUpResult(
    {
      body,
      ip: getRealIp(request.headers),
    },
    {
      checkRateLimit,
      hashPassword: (password) => hash(password, 12),
      getUserByEmail: dynamoDBUsers.getByEmail,
      createUser,
      onUserCreated: sendSignupAlertForUser,
    }
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
