import { prisma } from '@/lib/db';
import { fail, guard, ok } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { ECONOMY } from '@/lib/economy';
import { moveKeys, resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

/**
 * Open a locked record.
 *
 * Keys leave the opener immediately but do not reach the author yet - the Open
 * row holds them in escrow until a verdict, or until the rating window closes.
 * Paying the author here would reward whoever wrote the most tempting teaser,
 * and the teaser is the one part nobody can check before paying for it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'wall:open', RATE_LIMITS.createDrop);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'You need a ghost to spend Keys.');

  const { id } = await params;

  const secret = await prisma.wallSecret.findUnique({ where: { id } });
  if (!secret || secret.hidden) return fail(404, 'No such record.');
  if (!secret.isLocked) return fail(400, 'That record is not locked.');

  if (secret.ghostId === ghost.id) {
    return fail(400, 'That is your own record. You already know what it says.');
  }

  // Opening twice is free: you already paid for this one.
  const already = await prisma.open.findUnique({
    where: { secretId_ghostId: { secretId: id, ghostId: ghost.id } },
  });
  if (already) {
    return ok({
      body: secret.body,
      open: { id: already.id, status: already.status, verdict: already.verdict },
      keys: ghost.keys,
      replay: true,
    });
  }

  if (ghost.keys < secret.priceKeys) {
    return fail(402, `That costs ${secret.priceKeys} Keys and you have ${ghost.keys}.`, {
      keys: ghost.keys,
      price: secret.priceKeys,
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const balance = await moveKeys(tx, ghost.id, -secret.priceKeys, 'open', id);
      if (balance === null) return null;

      const open = await tx.open.create({
        data: { secretId: id, ghostId: ghost.id, priceKeys: secret.priceKeys },
      });

      await tx.wallSecret.update({
        where: { id },
        data: { opensCount: { increment: 1 } },
      });

      return { open, balance };
    });

    if (!result) return fail(402, 'Not enough Keys.');

    return ok({
      body: secret.body,
      open: { id: result.open.id, status: result.open.status, verdict: null },
      keys: result.balance,
      verdictWindowHours: ECONOMY.verdictWindowHours,
    });
  } catch {
    // The unique constraint catches a double-click racing itself; treat it as
    // the replay it is rather than charging twice.
    const raced = await prisma.open.findUnique({
      where: { secretId_ghostId: { secretId: id, ghostId: ghost.id } },
    });
    if (raced) {
      return ok({
        body: secret.body,
        open: { id: raced.id, status: raced.status, verdict: raced.verdict },
        keys: ghost.keys,
        replay: true,
      });
    }
    return fail(500, 'Could not complete that.');
  }
}
