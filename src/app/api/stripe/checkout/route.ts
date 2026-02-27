import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUserId } from '@/lib/api-auth'
import { dynamoDBUsers } from '@/lib/dynamodb'
import {
  assertPaidTier,
  buildMetadata,
  getPriceIdForTier,
  getReturnUrls,
  getStripe,
} from '@/lib/stripe-server'
import { AppMetrics } from '@/lib/metrics'
import { getSystemSettings } from '@/lib/system-settings'

export const runtime = 'nodejs'

const requestSchema = z.object({
  tier: z.enum(['core', 'pro', 'elite']),
  billingPeriod: z.enum(['monthly', 'annual']).optional().default('monthly'),
  returnContext: z.enum(['web', 'mobile']).optional().default('web'),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId()
    if ('error' in auth) return auth.error
    const { userId } = auth

    // Safe JSON parsing to prevent malformed requests from crashing
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const tier = assertPaidTier(parsed.data.tier)
    const billingPeriod = parsed.data.billingPeriod
    const returnContext = parsed.data.returnContext
    const stripe = getStripe()

    const user = await dynamoDBUsers.get(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const systemSettings = await getSystemSettings()
    if (user.isBeta && systemSettings.globalBetaMode) {
      return NextResponse.json(
        { error: 'Upgrades are disabled for beta users during the beta period.' },
        { status: 403 }
      )
    }

    let customerId = user.stripeCustomerId?.trim() || null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        metadata: { userId },
      })
      customerId = customer.id

      await dynamoDBUsers.upsert({
        id: userId,
        email: user.email,
        stripeCustomerId: customerId,
        emailVerified: user.emailVerified ?? null,
        isBeta: user.isBeta,
        isDisabled: user.isDisabled,
        disabledAt: user.disabledAt ?? null,
        disabledBy: user.disabledBy ?? null,
        disabledReason: user.disabledReason ?? null,
      })
    }

    let priceId: string
    try {
      priceId = getPriceIdForTier(tier, billingPeriod)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Price ID not configured'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured for this tier' }, { status: 500 })
    }

    const { successUrl, cancelUrl } = returnContext === 'mobile'
      ? getMobileReturnUrls(tier, billingPeriod)
      : getReturnUrls()
    const metadata = buildMetadata(userId, tier)
    const idempotencyKey = req.headers.get('Idempotency-Key') || randomUUID()

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        ui_mode: 'hosted',
        mode: 'subscription',
        customer: customerId,
        payment_method_types: ['card'],
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        subscription_data: {
          metadata,
        },
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
      },
      { idempotencyKey }
    )

    // Track checkout started for conversion analytics
    AppMetrics.subscriptionCheckoutStarted(userId, tier, billingPeriod)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

function getMobileReturnUrls(tier: 'core' | 'pro' | 'elite', billingPeriod: 'monthly' | 'annual') {
  const baseParams = `tier=${tier}&billingPeriod=${billingPeriod}`
  return {
    successUrl: `kinexfit://subscription/success?${baseParams}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `kinexfit://subscription/cancel?${baseParams}`,
  }
}
