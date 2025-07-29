import { Redis } from '@upstash/redis'
import { AnalysisResponse, CachedImageMetadata, UserSessionData } from '@/types/api'

export const redis = Redis.fromEnv()

/**
 * Caches image metadata to prevent re-processing
 */
export async function cacheImageMetadata(
  imageHash: string,
  metadata: CachedImageMetadata
): Promise<void> {
  try {
    const cacheKey = `image_meta:${imageHash}`
    // Cache for 24 hours
    await redis.set(cacheKey, JSON.stringify(metadata), { ex: 86400 })
  } catch (error) {
    console.error('Failed to cache image metadata:', error)
  }
}

/**
 * Retrieves cached image metadata
 */
export async function getCachedImageMetadata(
  imageHash: string
): Promise<CachedImageMetadata | null> {
  try {
    const cacheKey = `image_meta:${imageHash}`
    const cached = await redis.get(cacheKey)
    if (!cached) {
      return null;
    }
    // Handle cases where Redis client returns an object vs. a string
    if (typeof cached === 'object') {
      return cached as CachedImageMetadata;
    }
    if (typeof cached === 'string') {
      return JSON.parse(cached) as CachedImageMetadata;
    }
    // If it's neither an object nor a string, we can't process it.
    return null;
  } catch (error) {
    console.error('Failed to get cached image metadata:', error)
    return null
  }
}

// User session caching
export async function cacheUserSession(
  sessionId: string,
  sessionData: UserSessionData
): Promise<void> {
  try {
    const cacheKey = `session:${sessionId}`
    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(sessionData), { ex: 3600 })
  } catch (error) {
    console.error('Failed to cache user session:', error)
  }
}

export async function getCachedUserSession(
  sessionId: string
): Promise<UserSessionData | null> {
  try {
    const cacheKey = `session:${sessionId}`
    const cachedData = await redis.get(cacheKey)
    return cachedData ? (JSON.parse(cachedData as string) as UserSessionData) : null
  } catch (error) {
    console.error('Failed to get user session from cache:', error)
    return null
  }
}

/**
 * Caches an analysis result in Redis
 */
export const cacheAnalysisResult = async (
  imageHash: string,
  model: string,
  analysisMode: string,
  result: AnalysisResponse
): Promise<void> => {
  try {
    const cacheKey = `analysis:${imageHash}:${model}:${analysisMode}`;
    await redis.set(cacheKey, JSON.stringify(result), {
      // Cache for 24 hours
      ex: 86400,
    });
  } catch (error) {
    console.error(`Failed to cache analysis result:`, error);
  }
};

/**
 * Retrieves a cached analysis result from Redis
 */
export const getCachedAnalysisResult = async (
  imageHash: string,
  model: string,
  analysisMode: string
): Promise<AnalysisResponse | null> => {
  try {
    const cacheKey = `analysis:${imageHash}:${model}:${analysisMode}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      if (typeof cached === 'object' && cached !== null) {
        // Redis client might auto-parse JSON. If so, return directly.
        return cached as AnalysisResponse;
      }
      if (typeof cached === 'string') {
        return JSON.parse(cached) as AnalysisResponse;
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to get cached analysis result:`, error);
    return null;
  }
}; 