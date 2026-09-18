import { prisma } from '@/lib/db';
import { fail, guard, ok } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

/**
 * Every thread this ghost is part of, on either side.
 *
 * The listing carries no message content - only ciphertext counts and
 * timestamps - because the server has no way to produce a preview of something
 * it cannot decrypt. Previews happen in the browser, after the client unseals.
 */
export async function GET(request: Request) {
  const limited = guard(request, 'threads:list', RATE_LIMITS.read);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'No ghost on this request.');

  const threads = await prisma.thread.findMany({
    where: { OR: [{ authorGhostId: ghost.id }, { starterGhostId: ghost.id }] },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
    include: {
      secret: { select: { id: true, mood: true, teaser: true, body: true, isLocked: true } },
      _count: { select: { messages: true } },
    },
  });

  return ok({
    threads: threads.map((thread) => {
      const asAuthor = thread.authorGhostId === ghost.id;
      return {
        id: thread.id,
        role: asAuthor ? 'author' : 'starter',
        closed: thread.closed,
        messageCount: thread._count.messages,
        createdAt: thread.createdAt.toISOString(),
        lastMessageAt: thread.lastMessageAt.toISOString(),
        secret: {
          id: thread.secret.id,
          mood: thread.secret.mood,
          // A locked record shows its teaser here even to its own author, so
          // one code path cannot accidentally leak a body into a listing.
          preview: thread.secret.isLocked
            ? (thread.secret.teaser ?? '')
            : thread.secret.body.slice(0, 140),
        },
      };
    }),
  });
}
