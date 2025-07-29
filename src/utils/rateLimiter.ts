import { kv } from '@vercel/kv';
import { checkLocalRateLimit } from './localRateLimiter';

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,           // Maximum requests per IP
  windowMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  keyPrefix: 'rate_limit:',  // Redis key prefix
} as const;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}

/**
 * Check if IP address has exceeded rate limit
 * Uses sliding window approach with Redis for persistence
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  // Check if Vercel KV environment variables are available
  const hasKVConfig = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  
  if (!hasKVConfig) {
    console.log('Vercel KV not configured, using local rate limiting');
    return checkLocalRateLimit(ip);
  }

  try {
    const key = `${RATE_LIMIT_CONFIG.keyPrefix}${ip}`;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_CONFIG.windowMs;

    // Get existing requests for this IP
    const requests = await kv.zrange(key, 0, -1, { withScores: true });
    
    // Filter requests within the current window
    const validRequests = requests.filter((_: unknown, index: number) => {
      // Every other element is a score (timestamp)
      if (index % 2 === 1) {
        const timestamp = requests[index] as number;
        return timestamp > windowStart;
      }
      return false;
    });

    const currentCount = validRequests.length;

    // Check if limit exceeded
    if (currentCount >= RATE_LIMIT_CONFIG.maxRequests) {
      const oldestValidRequest = Math.min(...validRequests.map((score: unknown) => score as number));
      const resetTime = oldestValidRequest + RATE_LIMIT_CONFIG.windowMs;
      
      return {
        success: false,
        remaining: 0,
        resetTime,
        message: `Rate limit exceeded. You can make ${RATE_LIMIT_CONFIG.maxRequests} requests per 24 hours.`
      };
    }

    // Add current request to the set
    const requestId = `${now}-${Math.random()}`;
    await kv.zadd(key, { score: now, member: requestId });

    // Clean up old requests and set expiration
    await kv.zremrangebyscore(key, 0, windowStart);
    await kv.expire(key, Math.ceil(RATE_LIMIT_CONFIG.windowMs / 1000));

    const remaining = RATE_LIMIT_CONFIG.maxRequests - (currentCount + 1);
    const resetTime = now + RATE_LIMIT_CONFIG.windowMs;

    return {
      success: true,
      remaining,
      resetTime,
    };

  } catch (error) {
    console.error('Vercel KV rate limiting error, falling back to local storage:', error);
    
    // Fallback to local rate limiting
    return checkLocalRateLimit(ip);
  }
}

/**
 * Get client IP address from request headers
 * Handles various proxy configurations
 */
export function getClientIP(request: Request): string {
  // Try various headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, use the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // Fallback to a default IP (shouldn't happen in production)
  return '127.0.0.1';
}

/**
 * Format time until reset in human-readable format
 */
export function formatResetTime(resetTime: number): string {
  const now = Date.now();
  const timeUntilReset = resetTime - now;
  
  if (timeUntilReset <= 0) {
    return 'now';
  }

  const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
} 