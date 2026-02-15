import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseWorkoutContentWithFallback } from '@/lib/workout-parser'
import { dynamoDBUsers } from '@/lib/dynamodb'
import { getQuotaLimit, normalizeSubscriptionTier } from '@/lib/subscription-tiers'
import { hasRole } from '@/lib/rbac'
import { isMonthlyResetDue } from '@/lib/quota-reset'
import { ApifyInstagramError, fetchInstagramFromApify } from '@/lib/apify-instagram'

interface InstagramFetchRequest {
  url: string
}

const INSTAGRAM_URL_PATTERN = /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel)\/[\w-]+\/?(?:[?#].*)?$/i

function quotaExceededResponse(scanUsed: number, scanLimit: number, subscriptionTier: string) {
  return NextResponse.json(
    {
      error: 'Instagram import quota exceeded',
      message: `You have reached your monthly scan limit (${scanUsed}/${scanLimit}). Upgrade your subscription for more scans.`,
      quotaUsed: scanUsed,
      quotaLimit: scanLimit,
      subscriptionTier,
    },
    { status: 429 }
  )
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId()
    if ('error' in auth) return auth.error
    const { userId } = auth

    const user = await dynamoDBUsers.get(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isAdmin = hasRole(user, 'admin')
    const tier = normalizeSubscriptionTier(user.subscriptionTier)
    const scanLimit = getQuotaLimit(tier, 'workoutScansMonthly')
    let scanUsed = user.scanQuotaUsed ?? ((user.ocrQuotaUsed || 0) + (user.instagramImportsUsed || 0))
    let importsUsed = user.instagramImportsUsed || 0
    const lastScanReset = user.scanQuotaResetDate || user.ocrQuotaResetDate || user.lastInstagramImportReset

    if (!isAdmin && scanLimit !== null && isMonthlyResetDue(lastScanReset)) {
      await dynamoDBUsers.resetScanQuota(userId)
      scanUsed = 0
      importsUsed = 0
    }

    let payload: InstagramFetchRequest
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const url = typeof payload.url === 'string' ? payload.url.trim() : ''
    if (!url) {
      return NextResponse.json({ error: 'Instagram URL is required' }, { status: 400 })
    }

    if (!INSTAGRAM_URL_PATTERN.test(url)) {
      return NextResponse.json({ error: 'Invalid Instagram URL format' }, { status: 400 })
    }

    if (!isAdmin && scanLimit !== null && scanUsed >= scanLimit) {
      return quotaExceededResponse(scanUsed, scanLimit, user.subscriptionTier)
    }

    // Apply rate limiting after request validation so malformed requests do not burn quota.
    const rateLimit = await checkRateLimit(userId, 'api:instagram')
    if (!rateLimit.success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))
      return NextResponse.json(
        {
          error: 'Too many Instagram requests',
          message: 'You have exceeded the rate limit for Instagram fetching. Please try again later.',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      )
    }

    const apifyApiToken = process.env.APIFY_API_TOKEN
    if (!apifyApiToken) {
      console.error('[Instagram] APIFY_API_TOKEN not configured')
      return NextResponse.json(
        {
          error: 'Missing APIFY_API_TOKEN environment variable. See .env.example for setup.',
        },
        { status: 500 }
      )
    }

    let instagramData
    try {
      instagramData = await fetchInstagramFromApify({ url, apiToken: apifyApiToken })
    } catch (error) {
      if (error instanceof ApifyInstagramError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    if (!instagramData) {
      return NextResponse.json({ error: 'No Instagram post found' }, { status: 404 })
    }

    const caption = instagramData.caption
    const timestamp = instagramData.timestamp || new Date().toISOString()

    const parsedWorkout = await parseWorkoutContentWithFallback(caption, {
      context: { userId, subscriptionTier: user.subscriptionTier },
    })

    let scanUsedAfter = scanUsed
    let importsUsedAfter = importsUsed

    if (!isAdmin && scanLimit !== null) {
      const consumeResult = await dynamoDBUsers.consumeQuota(userId, 'scanQuotaUsed', scanLimit)
      if (!consumeResult.success) {
        return quotaExceededResponse(scanUsed, scanLimit, user.subscriptionTier)
      }
      scanUsedAfter = consumeResult.newValue ?? scanUsed + 1

      try {
        await dynamoDBUsers.incrementInstagramUsage(userId)
        importsUsedAfter = importsUsed + 1
      } catch (counterError) {
        console.error('[Instagram] Failed to increment instagramImportsUsed:', counterError)
      }
    }

    const resolvedTitle = parsedWorkout.title
      || `Instagram Workout - ${new Date(timestamp).toLocaleDateString()}`

    const workoutData = {
      url: instagramData.url || url,
      title: resolvedTitle,
      content: caption,
      author: {
        username: instagramData.ownerUsername || 'unknown',
        fullName: instagramData.ownerFullName || 'Unknown User',
      },
      stats: {
        likes: instagramData.likesCount || 0,
        comments: instagramData.commentsCount || 0,
      },
      image: instagramData.image || '',
      timestamp,
      mediaType: instagramData.mediaType,
      videoUrl: instagramData.videoUrl,
      parsedWorkout: {
        exercises: parsedWorkout.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          time: ex.unit === 'time' ? ex.reps : undefined,
        })),
        rawText: caption,
        totalExercises: parsedWorkout.exercises.length,
        workoutInstructions: parsedWorkout.summary,
        workoutType: parsedWorkout.workoutType,
        structure: parsedWorkout.structure,
        amrapBlocks: parsedWorkout.amrapBlocks,
        emomBlocks: parsedWorkout.emomBlocks,
        confidence: parsedWorkout.confidence,
        usedLLM: parsedWorkout.usedLLM,
        source: parsedWorkout.source,
      },
    }

    const currentLimit = isAdmin ? null : scanLimit

    return NextResponse.json({
      ...workoutData,
      quotaUsed: isAdmin ? scanUsed : scanUsedAfter,
      quotaLimit: currentLimit,
      isUnlimited: isAdmin || currentLimit === null,
      scanQuotaUsed: isAdmin ? scanUsed : scanUsedAfter,
      scanQuotaLimit: currentLimit,
      instagramImportsUsed: isAdmin ? importsUsed : importsUsedAfter,
    })
  } catch (error) {
    console.error('Instagram fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
