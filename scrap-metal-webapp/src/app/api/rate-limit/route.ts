import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getClientIP, formatResetTime } from '@/utils/rateLimiter';
import { getRateLimitStatus as getLocalRateLimitStatus } from '@/utils/localRateLimiter';

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,           // Maximum requests per IP
  windowMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  keyPrefix: 'rate_limit:',  // Redis key prefix
} as const;

/**
 * Get current rate limit status without incrementing counter
 */
async function getRateLimitStatus(ip: string) {
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
    const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - currentCount);

    // Calculate reset time
    let resetTime = now + RATE_LIMIT_CONFIG.windowMs;
    if (validRequests.length > 0) {
      const oldestValidRequest = Math.min(...validRequests.map((score: unknown) => score as number));
      resetTime = oldestValidRequest + RATE_LIMIT_CONFIG.windowMs;
    }

    return {
      success: remaining > 0,
      remaining,
      resetTime,
      total: RATE_LIMIT_CONFIG.maxRequests,
      resetIn: formatResetTime(resetTime),
    };

  } catch (error) {
    console.error('Vercel KV rate limit status error, falling back to local storage:', error);
    
    // Fallback to local rate limiting status
    const localResult = getLocalRateLimitStatus(ip);
    return {
      success: localResult.remaining > 0,
      remaining: localResult.remaining,
      resetTime: localResult.resetTime,
      total: RATE_LIMIT_CONFIG.maxRequests,
      resetIn: formatResetTime(localResult.resetTime),
    };
  }
}

/**
 * GET handler for rate limit status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const clientIP = getClientIP(request);
    const status = await getRateLimitStatus(clientIP);

    return NextResponse.json(status, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
        'X-RateLimit-Remaining': status.remaining.toString(),
        'X-RateLimit-Reset': status.resetTime.toString(),
      }
    });
  } catch (error) {
    console.error('Error fetching rate limit status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch rate limit status',
        remaining: 10,
        total: 10,
        resetTime: Date.now() + RATE_LIMIT_CONFIG.windowMs,
        resetIn: '24h'
      },
      { status: 500 }
    );
  }
} 