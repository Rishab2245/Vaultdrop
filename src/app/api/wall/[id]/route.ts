import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { safeEqual } from '@/lib/server-crypto';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = guard(request, 'wall:read', RATE_LIMITS.read);
  if (limited) return limited;

  const { id } = await params;
  const secret = await prisma.wallSecret.findUnique({ where: { id } });
  if (!secret || secret.hidden) return fail(404, 'That secret is not here.');

  // Fire-and-forget: a failed view count must never break the read.
  prisma.wallSecret
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return ok({
    secret: {
      id: secret.id,
      body: secret.body,
      mood: secret.mood,
      palette: secret.palette,
      reactions: {
        felt: secret.reactFelt,
        hug: secret.reactHug,
        whoa: secret.reactWhoa,
        same: secret.reactSame,
      },
      views: secret.viewCount + 1,
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
