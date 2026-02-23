/**
 * Rate Limiting Utility
 *
 * Uses Upstash Redis for distributed rate limiting across API routes.
 *
 * CONFIGURATION:
 * - Set UPSTASH_REDIS_REST_URL in .env
 * - Set UPSTASH_REDIS_REST_TOKEN in .env
 *
 * USAGE:
 * ```typescript
 * import { checkRateLimit } from '@/lib/rate-limit';
 *
 * const result = await checkRateLimit(userId, 'api:workouts');
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests. Try again later.' },
 *     { status: 429 }
 *   );
 * }
 * ```
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Redis client (singleton)
let redis: Redis | null = null;

/**
 * Get or create Redis client
 */
function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set. ' +
        'Sign up at https://upstash.com/ and add to .env'
      );
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

/**
 * Rate limit tiers by operation type
 *
 * Limits are per identifier (usually userId) per window
 */
export const RATE_LIMITS = {
  // General API operations
  'api:read': {
    requests: 100,
    window: '1 m', // 100 requests per minute
  },
  'api:write': {
    requests: 50,
    window: '1 m', // 50 writes per minute
  },

  // Expensive operations
  'api:ocr': {
    requests: 10,
    window: '1 h', // 10 OCR requests per hour (very expensive)
  },
  'api:instagram': {
    requests: 60,
    window: '1 h', // 60 Instagram fetches per hour (Apify costs)
  },
  'api:ai': {
    requests: 30,
    window: '1 h', // 30 AI requests per hour (Bedrock costs)
  },
  'api:ai-generate': {
    requests: 20,
    window: '1 h', // 20 AI generation requests per hour
  },

  // Authentication (per IP for login attempts)
  'auth:login': {
    requests: 10,
    window: '15 m', // 10 login attempts per 15 minutes
  },
  'auth:mobile-signin': {
    requests: 10,
    window: '15 m', // 10 mobile sign-in attempts per 15 minutes
  },
  'auth:mobile-refresh': {
    requests: 30,
    window: '15 m', // 30 token refresh attempts per 15 minutes
  },

  // File uploads
  'api:upload': {
    requests: 20,
    window: '1 h', // 20 uploads per hour
  },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

/**
 * Check rate limit for a given identifier and operation
 *
 * @param identifier - Usually userId, or IP address for unauthenticated endpoints
 * @param operation - The operation type (e.g., 'api:read', 'api:ocr')
 * @param options - Optional configuration
 * @param options.failClosed - If true, deny requests when Redis is down (default: false for reads, true for expensive ops)
 * @returns Result with success status and rate limit metadata
 */
export async function checkRateLimit(
  identifier: string,
  operation: RateLimitKey,
  options?: {
    failClosed?: boolean;
  }
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
}> {
  try {
    const client = getRedisClient();
    const config = RATE_LIMITS[operation];

    // Create rate limiter for this operation
    const ratelimit = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true,
      prefix: `ratelimit:${operation}`,
    });

    // Check rate limit
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);

    // Determine if we should fail closed (block requests) or open (allow requests)
    // For expensive operations (OCR, AI, Instagram), default to fail closed to prevent abuse
    const expensiveOps = ['api:ocr', 'api:ai', 'api:ai-generate', 'api:instagram'];
    const shouldFailClosed = options?.failClosed ?? expensiveOps.includes(operation);

    if (shouldFailClosed) {
      console.error(`[RateLimit] CRITICAL: Redis down for ${operation} - blocking request for safety`);
      return {
        success: false,
        limit: RATE_LIMITS[operation].requests,
        remaining: 0,
        reset: Date.now() + parseWindow(RATE_LIMITS[operation].window),
      };
    }

    // For non-critical operations, fail open to not block legitimate users
    console.warn(`[RateLimit] Redis down for ${operation} - allowing request (fail open)`);
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }
}

/**
 * Get rate limit info without incrementing the counter
 *
 * Useful for showing users their current rate limit status
 */
export async function getRateLimitInfo(
  identifier: string,
  operation: RateLimitKey
): Promise<{
  limit: number;
  remaining: number;
  reset: number;
} | null> {
  try {
    const client = getRedisClient();
    const config = RATE_LIMITS[operation];
    const key = `ratelimit:${operation}:${identifier}`;

    // Get current counter value
    const current = await client.get<number>(key);
    const ttl = await client.ttl(key);

    if (current === null) {
      return {
        limit: config.requests,
        remaining: config.requests,
        reset: Date.now() + parseWindow(config.window),
      };
    }

    return {
      limit: config.requests,
      remaining: Math.max(0, config.requests - current),
      reset: Date.now() + (ttl * 1000),
    };
  } catch (error) {
    console.error('[RateLimit] Error getting rate limit info:', error);
    return null;
  }
}

/**
 * Parse window string to milliseconds
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(ms|s|m|h|d)$/);
  if (!match) return 60000; // Default to 1 minute

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'ms': return value;
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
}

/**
 * Reset rate limit for a user (admin function)
 */
export async function resetRateLimit(
  identifier: string,
  operation: RateLimitKey
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `ratelimit:${operation}:${identifier}`;
    await client.del(key);
  } catch (error) {
    console.error('[RateLimit] Error resetting rate limit:', error);
  }
}
