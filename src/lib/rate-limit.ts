import "server-only";

/**
 * In-memory sliding-window-ish rate limiter. Fine for a single-instance
 * MVP deployment; a multi-instance production deployment would need this
 * backed by something shared (Redis, etc.) instead — noted here rather
 * than built now, since Verity only targets a single instance.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Avoid unbounded memory growth from one-off keys (e.g. per-IP after a
// single failed attempt each).
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, PRUNE_INTERVAL_MS).unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

/** Only for tests — production code should never need to reset this. */
export function _resetRateLimitStoreForTests() {
  buckets.clear();
}
