import { prisma } from './db';
import { ECONOMY, payoutForOpen } from './economy';
import { moveKeys } from './ghost-server';

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
 *
 * The scheduled run is daily rather than hourly, because Vercel's Hobby plan
 * only permits once-a-day crons. That is enough: expired drops are also deleted
 * lazily on read and opportunistically on write, and escrow settles on a 72h
 * window, so a daily pass adds at most a day of latency to something already
 * measured in days.
 */
export async function sweepExpired(): Promise<number> {
  const result = await prisma.encryptedDrop.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return result.count;
}

/**
 * Release escrow that nobody rated in time.
 *
 * Most opens are never rated - people read the thing and move on. Without this,
 * the majority of an author's earnings would sit frozen forever and locking a
 * record would stop being worth doing, which collapses the supply side of the
 * whole Exchange.
 *
 * Silence resolves in the author's favour deliberately. The opener had three
 * days and one tap to object.
 */
export async function settleStaleEscrow(): Promise<number> {
  const cutoff = new Date(Date.now() - ECONOMY.verdictWindowHours * 3_600_000);

  const stale = await prisma.open.findMany({
    where: { status: 'escrow', createdAt: { lte: cutoff } },
    include: { secret: { select: { id: true, ghostId: true } } },
    take: 200,
  });

  let settled = 0;

  for (const open of stale) {
    const authorId = open.secret.ghostId;

    try {
      await prisma.$transaction(async (tx) => {
        if (authorId) {
          const priorPaid = await tx.open.count({
            where: {
              ghostId: open.ghostId,
              status: 'released',
              secret: { ghostId: authorId },
            },
          });

          const payout = payoutForOpen(open.priceKeys, priorPaid);
          if (payout > 0) await moveKeys(tx, authorId, payout, 'release', open.id);

          // An unrated open counts toward volume but not toward reputation -
          // silence is not an endorsement.
          await tx.ghost.update({
            where: { id: authorId },
            data: { opensReceived: { increment: 1 } },
          });
        }

        await tx.open.update({
          where: { id: open.id },
          data: { status: 'released', settledAt: new Date() },
        });
      });
      settled++;
    } catch {
      // One stuck row must not stop the rest of the batch.
    }
  }

  return settled;
}

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** Sweep at most every few minutes, and never block the caller on it. */
export function sweepInBackground(): void {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;

  Promise.all([sweepExpired(), settleStaleEscrow()]).catch(() => {
    // A failed sweep must never fail the request that triggered it; the next
    // write, or the scheduled endpoint, will pick it up.
  });
}
