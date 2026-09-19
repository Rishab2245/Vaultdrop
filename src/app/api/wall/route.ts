import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { screenWallBody } from '@/lib/moderation';
import { computeHeat } from '@/lib/heat';
import { LIMITS, MOODS, MOOD_IDS, PALETTES, isMood } from '@/lib/constants';
import { ECONOMY, clampPrice, standingOf, worthItRate } from '@/lib/economy';
import { moveKeys, resolveGhost } from '@/lib/ghost-server';
import { isNearDuplicate, simhash } from '@/lib/simhash';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

interface PresentableSecret {
  id: string;
  body: string;
  mood: string;
  palette: number;
  reactFelt: number;
  reactHug: number;
  reactWhoa: number;
  reactSame: number;
  viewCount: number;
  createdAt: Date;
  isLocked: boolean;
  teaser: string | null;
  priceKeys: number;
  opensCount: number;
  worthItCount: number;
  notWorthCount: number;
  ghost?: { codename: string; worthItCount: number; notWorthCount: number } | null;
}

/**
 * Shape sent to the client.
 *
 * The one rule that matters here: a locked record's `body` NEVER leaves this
 * function unless the caller has an Open row for it. The previous build shipped
 * `content` on every secret and relied on the React component not to render it,
 * which meant one curl against the API dumped every paid secret on the
 * platform. Gating in the view layer is not gating.
 */
function present(secret: PresentableSecret, unlocked: boolean) {
  const locked = secret.isLocked && !unlocked;

  return {
    id: secret.id,
    // Deliberately absent, not blanked: a locked body has no representation here.
    body: locked ? null : secret.body,
    teaser: secret.teaser,
    isLocked: secret.isLocked,
    unlocked: secret.isLocked ? unlocked : true,
    priceKeys: secret.priceKeys,
    mood: secret.mood,
    palette: secret.palette,
    reactions: {
      felt: secret.reactFelt,
      hug: secret.reactHug,
      whoa: secret.reactWhoa,
      same: secret.reactSame,
    },
    views: secret.viewCount,
    opens: secret.opensCount,
    worthItRate: worthItRate(secret.worthItCount, secret.notWorthCount),
    author: secret.ghost
      ? {
          codename: secret.ghost.codename,
          standing: standingOf(secret.ghost.worthItCount, secret.ghost.notWorthCount),
        }
      : null,
    createdAt: secret.createdAt.toISOString(),
  };
}

const AUTHOR_SELECT = {
  ghost: { select: { codename: true, worthItCount: true, notWorthCount: true } },
} as const;

export async function GET(request: Request) {
  const limited = guard(request, 'wall:read', RATE_LIMITS.read);
  if (limited) return limited;

  const url = new URL(request.url);
  const rawSort = url.searchParams.get('sort');
  const sort = rawSort === 'new' || rawSort === 'price' ? rawSort : 'hot';
  const mood = url.searchParams.get('mood');
  const lockedOnly = url.searchParams.get('locked') === '1';
  const page = Math.max(0, Math.min(40, Number(url.searchParams.get('page') ?? 0) || 0));
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
  // An unparseable date would reach Prisma as Invalid Date and 500 the route.
  const sinceRaw = url.searchParams.get('since');
  const sinceDate = sinceRaw ? new Date(sinceRaw) : null;
  const since = sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate : null;

  const ghost = await resolveGhost(request);

  /*
   * Search deliberately never looks inside a sealed body.
   *
   * Matching on locked text would turn this endpoint into an oracle: guess a
   * phrase, see whether the record comes back, and read a paid secret a word at
   * a time without ever spending a Key. So a sealed record is searchable by its
   * teaser and its classification only - the parts its author chose to publish.
   */
  const search = query
    ? {
        OR: [
          { isLocked: false, body: { contains: query, mode: 'insensitive' as const } },
          { teaser: { contains: query, mode: 'insensitive' as const } },
          {
            mood: {
              in: MOODS.filter(
                (m) =>
                  m.label.toLowerCase().includes(query.toLowerCase()) ||
                  m.code.toLowerCase() === query.toLowerCase()
              ).map((m) => m.id),
            },
          },
        ],
      }
    : {};

  const where = {
    hidden: false,
    ...(mood && MOOD_IDS.includes(mood) ? { mood } : {}),
    ...(lockedOnly ? { isLocked: true } : {}),
    ...(since ? { createdAt: { gt: since } } : {}),
    ...search,
  };

  let items: PresentableSecret[];
  let hasMore: boolean;

  if (sort === 'price') {
    // Dearest first. Only meaningful among sealed records, so it implies them -
    // an open record has no price and would just pad the bottom of the list.
    const rows = await prisma.wallSecret.findMany({
      where: { ...where, isLocked: true },
      orderBy: [{ priceKeys: 'desc' }, { createdAt: 'desc' }],
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: AUTHOR_SELECT,
    });
    hasMore = rows.length > PAGE_SIZE;
    items = rows.slice(0, PAGE_SIZE);
  } else if (sort === 'new') {
    const rows = await prisma.wallSecret.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: AUTHOR_SELECT,
    });
    hasMore = rows.length > PAGE_SIZE;
    items = rows.slice(0, PAGE_SIZE);
  } else {
    // Stored heat decays as soon as it is written, so for the hot feed we pull a
    // generous window of candidates and re-decay them at read time. This keeps
    // yesterday's winner from sitting at the top forever.
    const candidates = await prisma.wallSecret.findMany({
      where,
      orderBy: { heat: 'desc' },
      take: 400,
      include: AUTHOR_SELECT,
    });

    const now = new Date();
    const ranked = candidates
      .map((s) => ({ secret: s, heat: computeHeat(s, now) }))
      .sort((a, b) => b.heat - a.heat);

    items = ranked.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((r) => r.secret);
    hasMore = ranked.length > (page + 1) * PAGE_SIZE;
  }

  // One query for everything this ghost has already paid to read, rather than
  // one per locked record in the page.
  let unlockedIds = new Set<string>();
  if (ghost) {
    const lockedIds = items.filter((i) => i.isLocked).map((i) => i.id);
    if (lockedIds.length > 0) {
      const opens = await prisma.open.findMany({
        where: { ghostId: ghost.id, secretId: { in: lockedIds } },
        select: { secretId: true },
      });
      unlockedIds = new Set(opens.map((o) => o.secretId));
    }
  }

  return ok({
    items: items.map((s) => present(s, unlockedIds.has(s.id))),
    hasMore,
    page,
  });
}

export async function POST(request: Request) {
  const limited = guard(request, 'wall:post', RATE_LIMITS.wallPost);
  if (limited) return limited;

  const body = await readJson(request);
  if (!body) return fail(400, 'Malformed request.');

  const raw = asString(body.body, LIMITS.wallBodyMax);
  if (!raw) return fail(400, `Say something, and keep it under ${LIMITS.wallBodyMax} characters.`);
  if (raw.length < LIMITS.wallBodyMin) {
    return fail(400, `That is too short - at least ${LIMITS.wallBodyMin} characters.`);
  }

  if (!isMood(body.mood)) return fail(400, 'Pick a mood.');

  const palette = Number(body.palette);
  const paletteIndex =
    Number.isInteger(palette) && palette >= 0 && palette < PALETTES.length ? palette : 0;

  const authorTokenHash = asString(body.authorTokenHash, 128);
  if (!authorTokenHash) return fail(400, 'Missing author token.');

  // Anonymous posting still works. A ghost is only required to lock a record,
  // because there has to be somebody for the Keys to reach.
  const ghost = await resolveGhost(request);

  const wantsLock = body.isLocked === true;
  if (wantsLock && !ghost) {
    return fail(401, 'Locking a record needs a ghost - otherwise nobody can be paid for it.');
  }

  const teaser = wantsLock ? asString(body.teaser, LIMITS.wallBodyMax) : null;
  if (wantsLock && (!teaser || teaser.length < LIMITS.wallBodyMin)) {
    return fail(400, 'A locked record needs a teaser so people know what they are paying for.');
  }

  const priceKeys = wantsLock ? clampPrice(body.priceKeys) : 0;

  // Moderation applies to whatever is publicly visible. For a locked record
  // that is the teaser; the body is screened too, since an opener is still a
  // person who can be doxxed by it.
  const bodyVerdict = screenWallBody(raw);
  if (bodyVerdict.action === 'block') return fail(422, bodyVerdict.reason);

  let cleanTeaser: string | null = null;
  let redactions = bodyVerdict.redactions;

  if (teaser) {
    const teaserVerdict = screenWallBody(teaser);
    if (teaserVerdict.action === 'block') return fail(422, `Teaser: ${teaserVerdict.reason}`);
    cleanTeaser = teaserVerdict.body;
    redactions += teaserVerdict.redactions;
  }

  // Velocity cap, so a script cannot mint Keys by filing all day.
  if (ghost) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todaysFiles = await prisma.wallSecret.count({
      where: { ghostId: ghost.id, createdAt: { gte: since } },
    });
    if (todaysFiles >= ECONOMY.maxFilesPerDay) {
      return fail(429, `That is ${ECONOMY.maxFilesPerDay} records today. Come back tomorrow.`);
    }
  }

  // Near-duplicate check against the recent corpus. Reposting someone else's
  // secret still publishes, it just earns nothing - hiding it would let people
  // probe for what already exists.
  const fingerprint = simhash(bodyVerdict.body);
  let isRepost = false;

  if (fingerprint) {
    const recent = await prisma.wallSecret.findMany({
      where: { hidden: false, simhash: { not: null } },
      select: { simhash: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    isRepost = recent.some(
      (r) => r.simhash && isNearDuplicate(fingerprint, r.simhash, ECONOMY.duplicateHammingThreshold)
    );
  }

  const createdAt = new Date();
  const secret = await prisma.wallSecret.create({
    data: {
      body: bodyVerdict.body,
      teaser: cleanTeaser,
      isLocked: wantsLock,
      priceKeys,
      mood: body.mood,
      palette: paletteIndex,
      authorTokenHash,
      ghostId: ghost?.id ?? null,
      simhash: fingerprint,
      createdAt,
      heat: computeHeat(
        { reactFelt: 0, reactHug: 0, reactWhoa: 0, reactSame: 0, viewCount: 0, createdAt },
        createdAt
      ),
    },
    include: AUTHOR_SELECT,
  });

  // Filing pays a little, and only for original public writing. Locked records
  // earn through opens instead, so paying here as well would be double-dipping.
  let keys: number | null = null;
  if (ghost && !isRepost && !wantsLock) {
    keys = await moveKeys(prisma, ghost.id, ECONOMY.fileReward, 'file', secret.id);
  }

  return ok(
    {
      // The author can always see their own body.
      secret: present(secret, true),
      redactions,
      isRepost,
      keys,
    },
    { status: 201 }
  );
}
