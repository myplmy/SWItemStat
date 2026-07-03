interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const LIMIT = 60;
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(clientId: string, now = Date.now()): RateLimitResult {
  const existing = buckets.get(clientId);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : existing;

  bucket.count += 1;
  buckets.set(clientId, bucket);

  if (buckets.size > 2_000) {
    for (const [key, candidate] of buckets) {
      if (candidate.resetAt <= now) buckets.delete(key);
    }
  }

  return {
    allowed: bucket.count <= LIMIT,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
}
