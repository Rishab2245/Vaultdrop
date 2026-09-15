import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { screenWallBody } from '@/lib/moderation';
import { computeHeat } from '@/lib/heat';
import { LIMITS, MOOD_IDS, PALETTES, isMood } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

/** Shape sent to the client. Note what is absent: any trace of an author. */
function present(secret: {
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
}) {
  return {
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
    views: secret.viewCount,
    createdAt: secret.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const limited = guard(request, 'wall:read', RATE_LIMITS.read);
  if (limited) return limited;

  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') === 'new' ? 'new' : 'hot';
  const mood = url.searchParams.get('mood');
  const page = Math.max(0, Math.min(40, Number(url.searchParams.get('page') ?? 0) || 0));

  const where = {
    hidden: false,
    ...(mood && MOOD_IDS.includes(mood) ? { mood } : {}),
  };

  if (sort === 'new') {
    const items = await prisma.wallSecret.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    });
    const hasMore = items.length > PAGE_SIZE;
    return ok({ items: items.slice(0, PAGE_SIZE).map(present), hasMore, page });
  }

  // Stored heat decays as soon as it is written, so for the hot feed we pull a
  // generous window of candidates and re-decay them at read time. This keeps
  // yesterday's winner from sitting at the top forever.
  const candidates = await prisma.wallSecret.findMany({
    where,
    orderBy: { heat: 'desc' },
    take: 400,
  });

  const now = new Date();
  const ranked = candidates
    .map((s) => ({ secret: s, heat: computeHeat(s, now) }))
    .sort((a, b) => b.heat - a.heat);

  const slice = ranked.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  return ok({
    items: slice.map((r) => present(r.secret)),
    hasMore: ranked.length > (page + 1) * PAGE_SIZE,
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
  const paletteIndex = Number.isInteger(palette) && palette >= 0 && palette < PALETTES.length
    ? palette
    : 0;

  const authorTokenHash = asString(body.authorTokenHash, 128);
  if (!authorTokenHash) return fail(400, 'Missing author token.');

  const verdict = screenWallBody(raw);
  if (verdict.action === 'block') return fail(422, verdict.reason);

  const createdAt = new Date();
  const secret = await prisma.wallSecret.create({
    data: {
      body: verdict.body,
      mood: body.mood,
      palette: paletteIndex,
      authorTokenHash,
      createdAt,
      heat: computeHeat(
        {
          reactFelt: 0,
          reactHug: 0,
          reactWhoa: 0,
          reactSame: 0,
          viewCount: 0,
          createdAt,
        },
        createdAt
      ),
    },
  });

  return ok({ secret: present(secret), redactions: verdict.redactions }, { status: 201 });
}
