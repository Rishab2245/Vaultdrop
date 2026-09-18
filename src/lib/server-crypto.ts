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

/**
 * sha256(secret) as URL-safe base64 - the server half of deriveGhostId.
 *
 * The client sends the raw secret in an Authorization header; we hash it and
 * look up the ghost. Only this hash is ever stored, so a dump of the database
 * does not let anyone act as a ghost.
 *
 * This is bearer-token authentication, with the honest limitation that comes
 * with it: the secret is in the request, so an operator who logged headers
 * could replay it. We do not log them. Signed requests would remove the need to
 * trust that, and are the upgrade path if Keys ever carry real value.
 */
export function deriveGhostIdFromSecret(secret: string): string {
  return createHash('sha256')
    .update(secret, 'utf8')
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
