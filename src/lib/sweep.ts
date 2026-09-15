import { prisma } from './db';

/**
 * Delete everything past its expiry.
 *
 * Without this, "we forget on a timer" is only true for drops somebody happens
 * to open - a drop nobody ever visits would sit in the database indefinitely,
 * which is exactly the promise this product is built on. Lazy deletion on read
 * is not enough on its own.
 *
 * Called opportunistically whenever a drop is created, and exposed as an
 * endpoint so a scheduler can guarantee it runs on a quiet site too.
 */
export async function sweepExpired(): Promise<number> {
  const result = await prisma.encryptedDrop.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return result.count;
}

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** Sweep at most every few minutes, and never block the caller on it. */
export function sweepInBackground(): void {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;

  sweepExpired().catch(() => {
    // A failed sweep must never fail the request that triggered it; the next
    // write, or the scheduled endpoint, will pick it up.
  });
}
