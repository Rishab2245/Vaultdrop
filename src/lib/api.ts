import { NextResponse } from 'next/server';
import { callerKey, rateLimit } from './ratelimit';

/** Never cache API responses - the Wall and inboxes change constantly. */
const NO_STORE = { 'Cache-Control': 'no-store' };

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { ...init, headers: { ...NO_STORE, ...init?.headers } });
}

export function fail(status: number, error: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

/**
 * Apply a rate limit, returning a 429 to send back when the window is full.
 * Returns null when the call may proceed.
 */
export function guard(
  request: Request,
  scope: string,
  config: { limit: number; windowMs: number }
): NextResponse | null {
  const key = callerKey(request.headers, scope);
  const result = rateLimit(key, config.limit, config.windowMs);
  if (result.ok) return null;
  return NextResponse.json(
    { error: 'Slow down for a moment.', retryAfter: result.retryAfterSeconds },
    { status: 429, headers: { ...NO_STORE, 'Retry-After': String(result.retryAfterSeconds) } }
  );
}

/** Parse a JSON body without letting a malformed payload throw a 500. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function asString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}
