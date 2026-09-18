import { prisma } from '@/lib/db';
import { fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { ECONOMY, payoutForOpen, refundFor } from '@/lib/economy';
import { moveKeys, resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

/**
 * Settle an escrowed open.
 *
 * "Worth it" releases the held Keys to the author and lifts their reputation.
 * "Not worth it" refunds most of the price to the opener and pays the author
 * nothing - the author still carries the mark on their record, because the cost
 * of writing a bad locked record has to land somewhere.
 *
 * The refund is partial by design. A full refund would make reading free for
 * anyone willing to click the second button, and then everyone clicks it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'opens:verdict', RATE_LIMITS.react);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'No ghost on this request.');

  const { id } = await params;
  const body = await readJson(request);
  if (!body) return fail(400, 'Malformed request.');

  const verdict = body.verdict;
  if (verdict !== 'worth' && verdict !== 'not_worth') {
    return fail(400, 'A verdict is either "worth" or "not_worth".');
  }

  const open = await prisma.open.findUnique({
    where: { id },
    include: { secret: true },
  });

  if (!open) return fail(404, 'No such open.');
  if (open.ghostId !== ghost.id) return fail(403, 'That open is not yours to rate.');
  if (open.status !== 'escrow') return fail(409, 'That one is already settled.');

  const authorId = open.secret.ghostId;

  const balance = await prisma.$transaction(async (tx) => {
    if (verdict === 'worth') {
      // Diminishing returns: past the cap, opening the same author again still
      // reads and still costs, it just stops being income for them.
      let payout = 0;
      if (authorId) {
        const priorPaid = await tx.open.count({
          where: {
            ghostId: ghost.id,
            status: 'released',
            secret: { ghostId: authorId },
          },
        });
        payout = payoutForOpen(open.priceKeys, priorPaid);
        if (payout > 0) await moveKeys(tx, authorId, payout, 'release', open.id);

        await tx.ghost.update({
          where: { id: authorId },
          data: { opensReceived: { increment: 1 }, worthItCount: { increment: 1 } },
        });
      }

      await tx.open.update({
        where: { id },
        data: { status: 'released', verdict, settledAt: new Date() },
      });
      await tx.wallSecret.update({
        where: { id: open.secretId },
        data: { worthItCount: { increment: 1 } },
      });

      const self = await tx.ghost.findUnique({ where: { id: ghost.id } });
      return self?.keys ?? ghost.keys;
    }

    const refund = refundFor(open.priceKeys);
    const next = await moveKeys(tx, ghost.id, refund, 'refund', open.id);

    if (authorId) {
      await tx.ghost.update({
        where: { id: authorId },
        data: { opensReceived: { increment: 1 }, notWorthCount: { increment: 1 } },
      });
    }

    await tx.open.update({
      where: { id },
      data: { status: 'refunded', verdict, settledAt: new Date() },
    });
    await tx.wallSecret.update({
      where: { id: open.secretId },
      data: { notWorthCount: { increment: 1 } },
    });

    return next ?? ghost.keys;
  });

  return ok({
    settled: true,
    verdict,
    keys: balance,
    refunded: verdict === 'not_worth' ? refundFor(open.priceKeys) : 0,
    of: ECONOMY.refundRate,
  });
}
