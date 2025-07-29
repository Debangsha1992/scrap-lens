/**
 * Local rate limiter using in-memory storage
 * This is a fallback when Vercel KV is not available
 */

interface RateLimitData {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limits (resets on server restart)
const rateLimitStore = new Map<string, RateLimitData>();

const RATE_LIMIT = 10; // requests per window
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check and update rate limit for a client IP
 */
export const checkLocalRateLimit = (clientIP: string) => {
  const now = Date.now();
  const key = `rate_limit:${clientIP}`;
  
  // Get current data
  let data = rateLimitStore.get(key);
  
  // If no data or window has expired, reset
  if (!data || now >= data.resetTime) {
    data = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
  }
  
  // Check if limit exceeded
  if (data.count >= RATE_LIMIT) {
    return {
      success: false,
      remaining: 0,
      resetTime: data.resetTime,
      message: `Rate limit exceeded. Try again after ${new Date(data.resetTime).toLocaleString()}.`,
    };
  }
  
  // Increment count
  data.count += 1;
  rateLimitStore.set(key, data);
  
  return {
    success: true,
    remaining: RATE_LIMIT - data.count,
    resetTime: data.resetTime,
    message: 'OK',
  };
};

/**
 * Get current rate limit status without incrementing
 */
export const getRateLimitStatus = (clientIP: string) => {
  const now = Date.now();
  const key = `rate_limit:${clientIP}`;
  
  const data = rateLimitStore.get(key);
  
  if (!data || now >= data.resetTime) {
    return {
      remaining: RATE_LIMIT,
      resetTime: now + WINDOW_MS,
    };
  }
  
  return {
    remaining: Math.max(0, RATE_LIMIT - data.count),
    resetTime: data.resetTime,
  };
}; 