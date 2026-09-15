import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** SHA-256, base64. Must match the browser's hashCapabilityToken byte for byte. */
export function sha256Base64(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('base64');
}

/** Constant-time comparison, so token checks do not leak via timing. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
