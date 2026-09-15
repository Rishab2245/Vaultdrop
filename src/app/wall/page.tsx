import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { computeHeat } from '@/lib/heat';
import { WallFeed } from '@/components/WallFeed';
import type { WallSecret } from '@/components/SecretCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Wall',
  description: 'Anonymous confessions, ranked by what people actually feel.',
};

const PAGE_SIZE = 24;

/**
 * The first page is read straight from the database rather than through our own
 * HTTP API - it is the same process, so a round trip would buy nothing and cost
 * a visible delay on the one screen that has to feel instant.
 */
async function getInitialFeed(): Promise<{ items: WallSecret[]; hasMore: boolean }> {
  const candidates = await prisma.wallSecret.findMany({
    where: { hidden: false },
    orderBy: { heat: 'desc' },
    take: 400,
  });

  const now = new Date();
  const ranked = candidates
    .map((secret) => ({ secret, heat: computeHeat(secret, now) }))
    .sort((a, b) => b.heat - a.heat);

  return {
    items: ranked.slice(0, PAGE_SIZE).map(({ secret }) => ({
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
    })),
    hasMore: ranked.length > PAGE_SIZE,
  };
}

export default async function WallPage() {
  const { items, hasMore } = await getInitialFeed();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-[2rem] leading-tight text-chrome">The Wall</h1>
        <p className="mt-2 max-w-lg text-base leading-relaxed text-body">
          Records people could not file anywhere else. Nobody here has a name, including you.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/confess" className="cmd-primary no-underline">
            File a record
          </Link>
          <Link href="/drop" className="cmd no-underline">
            Send it privately instead
          </Link>
        </div>
      </header>

      <WallFeed initialItems={items} initialHasMore={hasMore} />
    </div>
  );
}
