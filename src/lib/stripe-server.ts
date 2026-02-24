import Stripe from 'stripe'

const API_VERSION: Stripe.LatestApiVersion = '2025-10-29.clover'
const PAID_TIERS = ['core', 'pro', 'elite'] as const

export type PaidTier = (typeof PAID_TIERS)[number]
export type BillingPeriod = 'monthly' | 'annual'

let stripeInstance: Stripe | null = null

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return key
}

/**
 * Detect if a Stripe key is in test or live mode
 * Returns 'test' or 'live' based on key prefix
 */
function detectStripeMode(key: string): 'test' | 'live' | 'unknown' {
  if (key.startsWith('sk_test_') || key.startsWith('pk_test_')) {
    return 'test'
  }
  if (key.startsWith('sk_live_') || key.startsWith('pk_live_')) {
    return 'live'
  }
  return 'unknown'
}

/**
 * Validate Stripe keys against environment
 * CRITICAL: Prevents using test keys in production or live keys in development
 */
function validateStripeMode(secretKey: string): void {
  const mode = detectStripeMode(secretKey)
  const nodeEnv = process.env.NODE_ENV
  const isProduction = nodeEnv === 'production'
  const allowTestInProd = process.env.STRIPE_ALLOW_TEST_IN_PRODUCTION === 'true'

  // Log the detected mode for visibility
  console.log(`[Stripe] Detected key mode: ${mode}, Environment: ${nodeEnv}`)

  // CRITICAL: Never use test keys in production (unless explicitly allowed for sandbox testing)
  if (isProduction && mode === 'test' && !allowTestInProd) {
    throw new Error(
      'CRITICAL SECURITY ERROR: Test Stripe keys detected in production environment! ' +
      'This will prevent real payments from being processed. ' +
      'Please set STRIPE_SECRET_KEY to a live key (sk_live_...) or set STRIPE_ALLOW_TEST_IN_PRODUCTION=true for sandbox testing.'
    )
  }

  // WARNING: Using test keys in production with explicit override (sandbox mode)
  if (isProduction && mode === 'test' && allowTestInProd) {
    console.warn(
      '⚠️  WARNING: Using TEST Stripe keys in production environment (sandbox mode enabled)! ' +
      'No real payments will be processed. Only test cards will work. ' +
      'Set STRIPE_ALLOW_TEST_IN_PRODUCTION=false and use live keys for real payments.'
    )
  }

  // WARNING: Using live keys in development/test (allow but warn)
  if (!isProduction && mode === 'live') {
    console.warn(
      '⚠️  WARNING: Live Stripe keys detected in non-production environment! ' +
      'Real charges will be processed. Consider using test keys (sk_test_...) for development.'
    )
  }

  // ERROR: Unknown key format
  if (mode === 'unknown') {
    throw new Error(
      'Invalid Stripe secret key format. Expected format: sk_test_... or sk_live_...'
    )
  }
}

export function getStripe(): Stripe {
  if (typeof window !== 'undefined') {
    throw new Error('Stripe server client must not be used in the browser')
  }

  if (!stripeInstance) {
    const secretKey = getStripeSecretKey()

    // SECURITY: Validate key mode against environment
    validateStripeMode(secretKey)

    stripeInstance = new Stripe(secretKey, {
      apiVersion: API_VERSION,
      typescript: true,
    })
  }

  return stripeInstance
}

export function assertPaidTier(tier: string): PaidTier {
  if (!PAID_TIERS.includes(tier as PaidTier)) {
    throw new Error('Invalid subscription tier')
  }
  return tier as PaidTier
}

export function normalizePaidTier(tier: string | null | undefined): PaidTier | undefined {
  if (!tier) return undefined
  if (tier === 'starter') return 'core'
  return PAID_TIERS.includes(tier as PaidTier) ? (tier as PaidTier) : undefined
}

export function getPriceIdForTier(tier: PaidTier, billingPeriod: BillingPeriod = 'monthly'): string {
  const envKeys: Record<PaidTier, Record<BillingPeriod, (keyof NodeJS.ProcessEnv)[]>> = {
    core: {
      monthly: [
        'STRIPE_PRICE_CORE',
        'STRIPE_PRICE_STARTER',
        'NEXT_PUBLIC_STRIPE_PRICE_CORE',
        'NEXT_PUBLIC_STRIPE_PRICE_STARTER',
      ],
      annual: [
        'STRIPE_PRICE_CORE_ANNUAL',
        'STRIPE_PRICE_STARTER_ANNUAL',
        'NEXT_PUBLIC_STRIPE_PRICE_CORE_ANNUAL',
        'NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL',
      ],
    },
    pro: {
      monthly: ['STRIPE_PRICE_PRO', 'NEXT_PUBLIC_STRIPE_PRICE_PRO'],
      annual: ['STRIPE_PRICE_PRO_ANNUAL', 'NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL'],
    },
    elite: {
      monthly: ['STRIPE_PRICE_ELITE', 'NEXT_PUBLIC_STRIPE_PRICE_ELITE'],
      annual: ['STRIPE_PRICE_ELITE_ANNUAL', 'NEXT_PUBLIC_STRIPE_PRICE_ELITE_ANNUAL'],
    },
  }

  for (const key of envKeys[tier][billingPeriod]) {
    const value = process.env[key]
    if (value) return value
  }

  throw new Error(`Price ID for tier "${tier}" with billing period "${billingPeriod}" is not configured`)
}

export function getReturnUrls() {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    throw new Error('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL must be set for Stripe redirects')
  }

  return {
    successUrl: `${appUrl}/subscription?success=true`,
    cancelUrl: `${appUrl}/subscription?canceled=true`,
  }
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  return secret
}

export function buildMetadata(userId: string, tier: PaidTier) {
  return { userId, tier }
}

export function constructEventFromPayload(rawBody: string, signature: string | null): Stripe.Event {
  if (!signature) {
    throw new Error('Missing stripe-signature header')
  }

  return getStripe().webhooks.constructEvent(rawBody, signature, getWebhookSecret())
}
