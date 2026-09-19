import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { safeEqual } from '@/lib/server-crypto';
import { standingOf, worthItRate } from '@/lib/economy';
import { resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = guard(request, 'wall:read', RATE_LIMITS.read);
  if (limited) return limited;

  const { id } = await params;
  const secret = await prisma.wallSecret.findUnique({
    where: { id },
    include: { ghost: { select: { id: true, codename: true, worthItCount: true, notWorthCount: true } } },
  });
  if (!secret || secret.hidden) return fail(404, 'That secret is not here.');

  // A locked body is gated here exactly as it is in the feed. This endpoint
  // was missed once and served sealed records to anyone who asked for them by
  // id - the same failure as the build this one replaced, just one route over.
  // Every path that can emit `body` has to make this decision independently;
  // there is no single choke point, which is what made it easy to miss.
  const ghost = await resolveGhost(request);

  let unlocked = !secret.isLocked;
  if (secret.isLocked && ghost) {
    if (secret.ghostId === ghost.id) {
      unlocked = true; // your own record
    } else {
      const open = await prisma.open.findUnique({
        where: { secretId_ghostId: { secretId: id, ghostId: ghost.id } },
        select: { id: true },
      });
      unlocked = Boolean(open);
    }
  }

  // Fire-and-forget: a failed view count must never break the read.
  prisma.wallSecret
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return ok({
    secret: {
      id: secret.id,
      body: unlocked ? secret.body : null,
      teaser: secret.teaser,
      isLocked: secret.isLocked,
      unlocked,
      priceKeys: secret.priceKeys,
      mood: secret.mood,
      palette: secret.palette,
      reactions: {
        felt: secret.reactFelt,
        hug: secret.reactHug,
        whoa: secret.reactWhoa,
        same: secret.reactSame,
      },
      views: secret.viewCount + 1,
      opens: secret.opensCount,
      worthItRate: worthItRate(secret.worthItCount, secret.notWorthCount),
      author: secret.ghost
        ? {
            codename: secret.ghost.codename,
            standing: standingOf(secret.ghost.worthItCount, secret.ghost.notWorthCount),
          }
        : null,
      createdAt: secret.createdAt.toISOString(),
    },
  });
}

/**
 * Delete your own secret.
 *
 * Authorship is proved by presenting the token whose hash we stored at write
 * time. We never learn who the author is - only that this caller is the same
 * browser that wrote it.
 */
export async function DELETE(request: Request, { params }: Params) {
  const limited = guard(request, 'wall:delete', RATE_LIMITS.wallPost);
  if (limited) return limited;

  const { id } = await params;
  const body = await readJson(request);
  const tokenHash = asString(body?.authorTokenHash, 128);
  if (!tokenHash) return fail(400, 'Missing author token.');

  const secret = await prisma.wallSecret.findUnique({ where: { id } });
  if (!secret) return fail(404, 'That secret is not here.');

  if (!safeEqual(secret.authorTokenHash, tokenHash)) {
    return fail(403, 'That is not yours to delete.');
  }

  await prisma.wallSecret.delete({ where: { id } });
  return ok({ deleted: true });
}
