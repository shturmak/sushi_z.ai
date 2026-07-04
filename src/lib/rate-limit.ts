// In-memory store: key -> { count, resetAt }
const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (val.resetAt <= now) store.delete(key);
  }
}, 60_000);

interface RateLimitConfig {
  intervalMs: number; // time window in ms
  maxRequests: number; // max requests in the window
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number; // ms timestamp
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.intervalMs });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.intervalMs,
    };
  }

  if (existing.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    success: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

// Pre-configured limiters
export const authLimiter = (key: string) =>
  rateLimit(key, { intervalMs: 60_000, maxRequests: 10 });
export const apiLimiter = (key: string) =>
  rateLimit(key, { intervalMs: 60_000, maxRequests: 120 });
export const publicLimiter = (key: string) =>
  rateLimit(key, { intervalMs: 60_000, maxRequests: 60 });

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.success
      ? {}
      : { 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) }),
  };
}