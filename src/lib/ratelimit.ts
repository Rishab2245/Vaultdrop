import { createHmac, randomBytes } from 'node:crypto';

/**
 * Abuse control that does not become surveillance.
 *
 * Buckets live in memory only and are keyed by an HMAC of the caller's IP under
 * a secret that is generated at boot and rotated every hour. Nothing is written
 * to disk, the key cannot be reversed to an address, and after rotation even we
 * cannot connect yesterday's bucket to today's. The cost is that limits reset
 * on deploy and are per-instance - a trade we take happily, because the
 * alternative is a persistent log of who did what and when.
 */

const ROTATION_MS = 60 * 60 * 1000;

let salt = randomBytes(32);
let saltRotatedAt = Date.now();

function currentSalt(): Buffer {
  if (Date.now() - saltRotatedAt > ROTATION_MS) {
    salt = randomBytes(32);
    saltRotatedAt = Date.now();
    buckets.clear();
  }
  return salt;
}

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** Best-effort caller fingerprint. Hashed immediately and never stored raw. */
export function callerKey(headers: Headers, scope: string): string {
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'local';
  return createHmac('sha256', currentSalt()).update(`${scope}:${ip}`).digest('base64');
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** Sliding-window limiter. Returns how long to wait when the window is full. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Opportunistic cleanup so a long-running process does not grow unbounded.
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { ok: true, retryAfterSeconds: 0 };
}

export const RATE_LIMITS = {
  wallPost: { limit: 5, windowMs: 10 * 60 * 1000 },
  react: { limit: 60, windowMs: 60 * 1000 },
  report: { limit: 10, windowMs: 60 * 60 * 1000 },
  createDrop: { limit: 20, windowMs: 60 * 60 * 1000 },
  createInbox: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  sendToInbox: { limit: 15, windowMs: 60 * 60 * 1000 },
  read: { limit: 240, windowMs: 60 * 1000 },
} as const;

/** Reset all buckets. Test-only escape hatch. */
export function __resetRateLimits(): void {
  buckets.clear();
}
