import { prisma } from '@/lib/db';
import { fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { REACTIONS, isReaction } from '@/lib/constants';
import { computeHeat } from '@/lib/heat';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * React to a secret.
 *
 * There is deliberately no per-user reaction row. Storing "who reacted to what"
 * would build exactly the behavioural profile this product exists to avoid, so
 * we keep counters only. Double-reacting is prevented in the client and capped
 * by the rate limiter - a softer guarantee, bought with a real privacy gain.
 */
export async function POST(request: Request, { params }: Params) {
  const limited = guard(request, 'wall:react', RATE_LIMITS.react);
  if (limited) return limited;

  const { id } = await params;
  const body = await readJson(request);
  const reaction = body?.reaction;

  if (!isReaction(reaction)) return fail(400, 'Unknown reaction.');

  const column = REACTIONS.find((r) => r.id === reaction)!.column;
  const undo = body?.undo === true;

  const existing = await prisma.wallSecret.findUnique({ where: { id } });
  if (!existing || existing.hidden) return fail(404, 'That secret is not here.');

  // Guard the floor so an undo storm cannot drive a counter negative.
  const current = existing[column as keyof typeof existing] as number;
  if (undo && current <= 0) {
    return ok({
      reactions: {
        felt: existing.reactFelt,
        hug: existing.reactHug,
        whoa: existing.reactWhoa,
        same: existing.reactSame,
      },
    });
  }

  const updated = await prisma.wallSecret.update({
    where: { id },
    data: { [column]: undo ? { decrement: 1 } : { increment: 1 } },
  });

  const heat = computeHeat(updated);
  await prisma.wallSecret.update({ where: { id }, data: { heat } });

  return ok({
    reactions: {
      felt: updated.reactFelt,
      hug: updated.reactHug,
      whoa: updated.reactWhoa,
      same: updated.reactSame,
    },
  });
}
