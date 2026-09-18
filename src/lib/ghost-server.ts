import type { Ghost, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './db';
import { deriveGhostIdFromSecret } from './server-crypto';
import { ECONOMY, type LedgerReason, utcDayKey } from './economy';

/** Prisma client or an interactive transaction - ledger writes work on both. */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * A codename derived from the ghost id.
 *
 * Derived rather than chosen on purpose. A chosen handle can be squatted,
 * impersonated, or used to signal who you are - all three defeat the point.
 * The same id always yields the same codename, so restoring from a recovery
 * key restores the name too.
 */
export function codenameFor(ghostId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < ghostId.length; i++) {
    hash ^= ghostId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const block = (hash & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const letter = String.fromCharCode(65 + ((hash >>> 16) % 26));
  return `GHOST-${block}-${letter}`;
}

/**
 * Resolve the ghost making this request, or null when it is anonymous.
 *
 * Anonymous is a first-class case, not an error. Reading the Wall, filing a
 * public record, and reacting all work without ever claiming an identity - only
 * the Exchange needs one.
 */
export async function resolveGhost(request: Request): Promise<Ghost | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Ghost ')) return null;

  const secret = header.slice(6).trim();
  if (!secret) return null;

  const id = deriveGhostIdFromSecret(secret);
  const ghost = await prisma.ghost.findUnique({ where: { id } });
  if (!ghost) return null;

  return grantDailyKeys(ghost);
}

/**
 * Hand out the daily grant on the ghost's first authenticated call of the day.
 *
 * Keyed on the UTC date rather than a rolling 24 hours so it cannot be nudged
 * forward a few minutes at a time, and so it is idempotent under concurrent
 * requests - a second call the same day updates nothing.
 */
async function grantDailyKeys(ghost: Ghost): Promise<Ghost> {
  const today = utcDayKey();
  if (ghost.lastGrantOn === today) return ghost;

  try {
    return await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: two tabs opening at once must not both
      // see yesterday's date and both grant.
      const fresh = await tx.ghost.findUnique({ where: { id: ghost.id } });
      if (!fresh || fresh.lastGrantOn === today) return fresh ?? ghost;

      const updated = await tx.ghost.update({
        where: { id: ghost.id },
        data: {
          keys: { increment: ECONOMY.dailyGrant },
          lastGrantOn: today,
          lastSeenAt: new Date(),
        },
      });

      await recordLedger(tx, updated.id, ECONOMY.dailyGrant, updated.keys, 'daily');
      return updated;
    });
  } catch {
    // A failed grant must never fail the request it was attached to.
    return ghost;
  }
}

/** Append one row to the ghost's Key history. */
export async function recordLedger(
  db: Db,
  ghostId: string,
  delta: number,
  balance: number,
  reason: LedgerReason,
  refId?: string
): Promise<void> {
  await db.ledgerEntry.create({
    data: { ghostId, delta, balance, reason, refId },
  });
}

/**
 * Move Keys and log the movement, atomically.
 *
 * Every balance change goes through here so no path can alter a balance
 * without leaving a row behind. Returns null when the ghost cannot afford it,
 * which callers must treat as a refusal rather than an error.
 */
export async function moveKeys(
  db: Db,
  ghostId: string,
  delta: number,
  reason: LedgerReason,
  refId?: string
): Promise<number | null> {
  const ghost = await db.ghost.findUnique({ where: { id: ghostId } });
  if (!ghost) return null;

  const next = ghost.keys + delta;
  if (next < 0) return null;

  await db.ghost.update({ where: { id: ghostId }, data: { keys: next } });
  await recordLedger(db, ghostId, delta, next, reason, refId);
  return next;
}

/** The public shape of a ghost. Note there is nothing here to identify a person. */
export function presentGhost(ghost: Ghost) {
  return {
    id: ghost.id,
    codename: ghost.codename,
    keys: ghost.keys,
    opensReceived: ghost.opensReceived,
    worthItCount: ghost.worthItCount,
    notWorthCount: ghost.notWorthCount,
    createdAt: ghost.createdAt.toISOString(),
  };
}
