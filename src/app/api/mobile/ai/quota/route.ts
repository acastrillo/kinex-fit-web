/**
 * Mobile AI Quota Endpoint
 *
 * GET /api/mobile/ai/quota
 *
 * Returns the user's current AI usage and limits.
 *
 * Response:
 * {
 *   "used": 3,
 *   "limit": 10,
 *   "remaining": 7,
 *   "isExhausted": false,
 *   "tier": "core",
 *   "resetsAt": "2025-02-01T00:00:00.000Z"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { dynamoDBUsers } from "@/lib/dynamodb";
import {
  getAIRequestLimit,
  normalizeSubscriptionTier,
} from "@/lib/subscription-tiers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Authenticate mobile request
  const auth = await authenticateMobileRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = auth;

  try {
    // Get user from database
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = normalizeSubscriptionTier(user.subscriptionTier);
    const limit = getAIRequestLimit(tier);
    const used = user.aiRequestsUsed || 0;
    const remaining = Math.max(0, limit - used);

    // Calculate reset date (first of next month)
    const now = new Date();
    const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return NextResponse.json({
      used,
      limit,
      remaining,
      isExhausted: remaining <= 0,
      tier,
      resetsAt: resetsAt.toISOString(),
    });
  } catch (error) {
    console.error("[Mobile AI Quota] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota" },
      { status: 500 }
    );
  }
}
