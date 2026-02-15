export type InstagramMediaType = 'post' | 'reel'

export interface InstagramApifyResult {
  url: string
  caption: string
  timestamp: string
  ownerUsername: string
  ownerFullName: string
  likesCount: number
  commentsCount: number
  image: string
  videoUrl?: string
  mediaType: InstagramMediaType
  actorId: string
}

interface RawInstagramItem {
  [key: string]: unknown
  url?: unknown
  caption?: unknown
  text?: unknown
  timestamp?: unknown
  ownerUsername?: unknown
  ownerFullName?: unknown
  likesCount?: unknown
  commentsCount?: unknown
  displayUrl?: unknown
  images?: unknown
  videoUrl?: unknown
  downloadedVideo?: unknown
}

interface FetchInstagramFromApifyOptions {
  url: string
  apiToken: string
  postActorId?: string
  reelActorId?: string
  timeoutMs?: number
}

export class ApifyInstagramError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApifyInstagramError'
    this.status = status
  }
}

const DEFAULT_POST_ACTOR = 'apify~instagram-post-scraper'
const DEFAULT_REEL_ACTOR = 'apify~instagram-reel-scraper'
const DEFAULT_TIMEOUT_MS = 90_000

export function inferInstagramMediaType(url: string): InstagramMediaType | null {
  if (/\/reel\/[\w-]+/i.test(url)) return 'reel'
  if (/\/p\/[\w-]+/i.test(url)) return 'post'
  return null
}

export async function fetchInstagramFromApify(
  options: FetchInstagramFromApifyOptions
): Promise<InstagramApifyResult | null> {
  const mediaType = inferInstagramMediaType(options.url)
  if (!mediaType) {
    throw new ApifyInstagramError('Invalid Instagram URL format', 400)
  }

  const postActorId = getActorId(
    options.postActorId || process.env.APIFY_INSTAGRAM_POST_ACTOR,
    DEFAULT_POST_ACTOR
  )
  const reelActorId = getActorId(
    options.reelActorId || process.env.APIFY_INSTAGRAM_REEL_ACTOR,
    DEFAULT_REEL_ACTOR
  )

  const primaryActorId = mediaType === 'reel' ? reelActorId : postActorId
  const fallbackActorId = mediaType === 'reel' ? postActorId : reelActorId
  const timeoutMs = options.timeoutMs || Number(process.env.APIFY_INSTAGRAM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS

  const primaryResult = await runActor({
    actorId: primaryActorId,
    url: options.url,
    apiToken: options.apiToken,
    timeoutMs,
    mediaType,
  })
  if (primaryResult) return primaryResult

  if (fallbackActorId === primaryActorId) return null

  return runActor({
    actorId: fallbackActorId,
    url: options.url,
    apiToken: options.apiToken,
    timeoutMs,
    mediaType,
  })
}

function getActorId(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

async function runActor(params: {
  actorId: string
  url: string
  apiToken: string
  timeoutMs: number
  mediaType: InstagramMediaType
}): Promise<InstagramApifyResult | null> {
  const { actorId, url, apiToken, timeoutMs, mediaType } = params
  const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?format=json&clean=true&limit=1`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        username: [url],
        resultsLimit: 1,
        skipPinnedPosts: true,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ApifyInstagramError(
        `Instagram scraper request failed (${response.status})`,
        502
      )
    }

    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) {
      throw new ApifyInstagramError('Instagram scraper returned an invalid response', 502)
    }

    if (payload.length === 0) return null
    const firstItem = payload[0] as RawInstagramItem
    return normalizeInstagramItem(firstItem, url, mediaType, actorId)
  } catch (error: unknown) {
    if (error instanceof ApifyInstagramError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApifyInstagramError('Instagram scraper timed out. Try again in a moment.', 408)
    }
    throw new ApifyInstagramError('Failed to fetch Instagram data from scraper', 502)
  } finally {
    clearTimeout(timeoutId)
  }
}

function normalizeInstagramItem(
  item: RawInstagramItem,
  fallbackUrl: string,
  mediaType: InstagramMediaType,
  actorId: string
): InstagramApifyResult {
  const images = toStringArray(item.images)
  const displayUrl = asString(item.displayUrl)
  const image = displayUrl || images[0] || ''
  const caption = asString(item.caption) || asString(item.text) || ''

  return {
    url: asString(item.url) || fallbackUrl,
    caption,
    timestamp: asString(item.timestamp) || new Date().toISOString(),
    ownerUsername: asString(item.ownerUsername) || 'unknown',
    ownerFullName: asString(item.ownerFullName) || 'Unknown User',
    likesCount: asNumber(item.likesCount),
    commentsCount: asNumber(item.commentsCount),
    image,
    videoUrl: asString(item.videoUrl) || asString(item.downloadedVideo) || undefined,
    mediaType,
    actorId,
  }
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}
