import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { randomUUID } from "crypto";
import { getRequestIp } from "@/lib/request-ip";
import { getRedisClient } from "@/lib/upstash";

const GUEST_COOKIE_NAME = "kinex_guest_session";
const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const GUEST_USAGE_TTL_SECONDS = GUEST_COOKIE_MAX_AGE_SECONDS;
const GUEST_USAGE_KEY_PREFIX = "guest:usage";

export const GUEST_SCAN_LIMIT = 3;
export const GUEST_AI_LIMIT = 1;

type GuestQuotaKind = "ai" | "scan" | "ocr" | "instagram";

export interface GuestUsageSnapshot {
  aiUsed: number;
  scanUsed: number;
  ocrUsed: number;
  instagramUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuestSession {
  kind: "guest";
  guestId: string;
  actorId: string;
  rateLimitId: string;
  ipAddress: string;
  isFresh: boolean;
  cookieValue: string;
  usage: GuestUsageSnapshot;
}

function getGuestSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "kinex-fit-guest-session-dev-secret"
  );
}

function getUsageKey(guestId: string) {
  return `${GUEST_USAGE_KEY_PREFIX}:${guestId}`;
}

function toNumber(value: unknown) {
  const normalized =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number.parseInt(value, 10)
      : Number.NaN;

  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizeGuestUsage(
  usage: Record<string, unknown> | null | undefined
): GuestUsageSnapshot {
  const now = new Date().toISOString();

  return {
    aiUsed: toNumber(usage?.aiUsed),
    scanUsed: toNumber(usage?.scanUsed),
    ocrUsed: toNumber(usage?.ocrUsed),
    instagramUsed: toNumber(usage?.instagramUsed),
    createdAt:
      typeof usage?.createdAt === "string" ? usage.createdAt : now,
    updatedAt:
      typeof usage?.updatedAt === "string" ? usage.updatedAt : now,
  };
}

async function signGuestToken(guestId: string) {
  return new SignJWT({
    gid: guestId,
    type: "guest",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GUEST_COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getGuestSecret());
}

async function verifyGuestToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getGuestSecret());

    if (payload.type !== "guest" || typeof payload.gid !== "string") {
      return null;
    }

    return payload.gid;
  } catch {
    return null;
  }
}

async function readGuestId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyGuestToken(token);
}

export async function getOrCreateGuestSession(headers?: Headers | null): Promise<GuestSession> {
  const existingGuestId = await readGuestId();
  const guestId = existingGuestId || randomUUID();
  const ipAddress = getRequestIp(headers);
  const cookieValue = await signGuestToken(guestId);
  const usage = await getGuestUsage(guestId);

  return {
    kind: "guest",
    guestId,
    actorId: `guest:${guestId}`,
    rateLimitId: `guest:${guestId}:${ipAddress}`,
    ipAddress,
    isFresh: !existingGuestId,
    cookieValue,
    usage,
  };
}

export function applyGuestSessionCookie(
  response: NextResponse,
  session: GuestSession
) {
  response.cookies.set({
    name: GUEST_COOKIE_NAME,
    value: session.cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export async function getGuestUsage(guestId: string): Promise<GuestUsageSnapshot> {
  const client = getRedisClient();
  const raw = await client.hgetall<Record<string, unknown>>(getUsageKey(guestId));
  return normalizeGuestUsage(raw);
}

export async function consumeGuestQuota(
  guestId: string,
  kind: GuestQuotaKind,
  limit: number
): Promise<{
  success: boolean;
  usage: GuestUsageSnapshot;
  remaining: number;
}> {
  const client = getRedisClient();
  const usageKey = getUsageKey(guestId);
  const current = await getGuestUsage(guestId);

  const currentValue =
    kind === "ai"
      ? current.aiUsed
      : kind === "scan"
      ? current.scanUsed
      : kind === "ocr"
      ? current.ocrUsed
      : current.instagramUsed;

  if (currentValue >= limit) {
    return {
      success: false,
      usage: current,
      remaining: 0,
    };
  }

  const now = new Date().toISOString();
  const updates: Record<string, string | number> = {
    updatedAt: now,
  };

  if (!current.createdAt) {
    updates.createdAt = now;
  }

  if (kind === "ai") {
    updates.aiUsed = current.aiUsed + 1;
  } else if (kind === "scan") {
    updates.scanUsed = current.scanUsed + 1;
  } else if (kind === "ocr") {
    updates.ocrUsed = current.ocrUsed + 1;
  } else {
    updates.instagramUsed = current.instagramUsed + 1;
  }

  if (kind === "ocr") {
    updates.scanUsed = current.scanUsed + 1;
  }

  if (kind === "instagram") {
    updates.scanUsed = current.scanUsed + 1;
  }

  await client.hset(usageKey, updates);
  await client.expire(usageKey, GUEST_USAGE_TTL_SECONDS);

  const usage = normalizeGuestUsage({
    ...current,
    ...updates,
  });

  const nextValue =
    kind === "ai"
      ? usage.aiUsed
      : kind === "scan"
      ? usage.scanUsed
      : kind === "ocr"
      ? usage.ocrUsed
      : usage.instagramUsed;

  return {
    success: true,
    usage,
    remaining: Math.max(0, limit - nextValue),
  };
}

export function buildGuestQuotaExceededResponse(options: {
  feature: "scan" | "ai";
  used: number;
  limit: number;
}) {
  const { feature, used, limit } = options;

  if (feature === "scan") {
    return NextResponse.json(
      {
        error: "Guest scan quota exceeded",
        message:
          "Guest import includes 3 OCR or Instagram scans. Create a free account to keep going.",
        quotaUsed: used,
        quotaLimit: limit,
        scanQuotaUsed: used,
        scanQuotaLimit: limit,
        isGuest: true,
      },
      { status: 429 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "Guest AI includes 1 generation or enhancement. Create a free account to keep going.",
      quotaRemaining: 0,
      aiUsed: used,
      aiLimit: limit,
      isGuest: true,
    },
    { status: 403 }
  );
}
