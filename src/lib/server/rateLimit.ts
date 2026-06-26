interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, BucketEntry>>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  bucket: string,
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const store = stores.get(bucket) ?? new Map<string, BucketEntry>();
  stores.set(bucket, store);

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      ok: true,
      remaining: Math.max(0, config.limit - 1),
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  if (current.count >= config.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, config.limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function resetRateLimits(): void {
  stores.clear();
}
