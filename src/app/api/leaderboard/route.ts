import { prisma } from '@/lib/db';
import { guard, ok } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { ECONOMY, standingOf, worthItRate } from '@/lib/economy';

export const dynamic = 'force-dynamic';

const LIMIT = 10;

/**
 * Standing, and the records that earned it.
 *
 * Computed on read rather than kept in a table. The inputs are small, they
 * already live on the rows, and a denormalised leaderboard is a thing that
 * silently goes stale and then quietly lies to people about their reputation.
 *
 * Ranked by the proportion of opens people confirmed were worth it, never by
 * volume. Ranking by volume would reward filing constantly, which is precisely
 * the behaviour the Exchange exists to make unprofitable.
 */
export async function GET(request: Request) {
  const limited = guard(request, 'leaderboard', RATE_LIMITS.read);
  if (limited) return limited;

  const [ghosts, records] = await Promise.all([
    // Pull a generous window of ghosts who have actually been read, then rank
    // in memory - the rate cannot be expressed as an orderBy.
    prisma.ghost.findMany({
      where: { opensReceived: { gt: 0 } },
      select: {
        codename: true,
        opensReceived: true,
        worthItCount: true,
        notWorthCount: true,
        keys: true,
      },
      orderBy: { opensReceived: 'desc' },
      take: 200,
    }),
    prisma.wallSecret.findMany({
      where: { hidden: false },
      select: {
        id: true,
        body: true,
        teaser: true,
        isLocked: true,
        mood: true,
        palette: true,
        reactFelt: true,
        reactHug: true,
        reactWhoa: true,
        reactSame: true,
        opensCount: true,
        worthItCount: true,
        notWorthCount: true,
        commentCount: true,
        createdAt: true,
        ghost: { select: { codename: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 400,
    }),
  ]);

  const ranked = ghosts
    .map((g) => ({
      codename: g.codename,
      opens: g.opensReceived,
      rate: worthItRate(g.worthItCount, g.notWorthCount),
      standing: standingOf(g.worthItCount, g.notWorthCount),
    }))
    // Below the evidence threshold a rate is noise, so those ghosts do not rank.
    .filter((g) => g.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0) || b.opens - a.opens)
    .slice(0, LIMIT);

  // Hall of fame: the records people actually responded to. Reactions are
  // weighted the way heat weights them - "sending love" costs more thought
  // than "same" - and a confirmed paid read counts for more than either.
  const hall = records
    .map((r) => ({
      record: r,
      score:
        r.reactHug * 2 +
        r.reactFelt * 1.5 +
        r.reactWhoa * 1.2 +
        r.reactSame +
        r.worthItCount * 4 +
        r.commentCount * 1.5,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, LIMIT)
    .map(({ record: r }) => ({
      id: r.id,
      // A sealed record shows its teaser here. Never its body: a leaderboard is
      // one more path that can emit one, and it does not get to be the leak.
      preview: r.isLocked ? (r.teaser ?? '') : r.body,
      isLocked: r.isLocked,
      mood: r.mood,
      palette: r.palette,
      reactions: r.reactFelt + r.reactHug + r.reactWhoa + r.reactSame,
      opens: r.opensCount,
      comments: r.commentCount,
      worthItRate: worthItRate(r.worthItCount, r.notWorthCount),
      codename: r.ghost?.codename ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

  return ok({
    ghosts: ranked,
    hall,
    /** Stated so the page can explain the ranking instead of asserting it. */
    minRatingsToRank: 3,
    maxPrice: ECONOMY.maxPrice,
  });
}
