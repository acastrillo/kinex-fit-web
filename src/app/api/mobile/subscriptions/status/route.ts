import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/mobile-auth'
import { getUserById } from '@/lib/dynamodb-users'
import { normalizeSubscriptionTier } from '@/lib/subscription-tiers'

export const runtime = 'nodejs'

/**
 * GET /api/mobile/subscriptions/status
 * Returns the user's current subscription state for mobile refresh flows.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      subscriptionTier: normalizeSubscriptionTier(user.subscriptionTier),
      subscriptionStatus: user.subscriptionStatus ?? 'active',
      subscriptionExpiresAt: user.subscriptionEndDate ?? null,
    })
  } catch (error) {
    console.error('Mobile subscription status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
