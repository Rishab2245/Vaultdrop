import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { MOODS, PALETTES } from '@/lib/constants';
import { standingOf, worthItRate } from '@/lib/economy';
import { recordRef, timeAgo } from '@/lib/format';
import { RecordPermalink } from '@/components/RecordPermalink';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * A record's own page.
 *
 * This is what the share card and every pasted link point at. Without it the
 * whole distribution argument collapses: an image somebody screenshots has
 * nowhere to send the person who reads it.
 */
async function load(id: string) {
  return prisma.wallSecret.findUnique({
    where: { id },
    include: { ghost: { select: { codename: true, worthItCount: true, notWorthCount: true } } },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const secret = await load(id).catch(() => null);

  if (!secret || secret.hidden) return { title: 'Record not found' };

  // A sealed record advertises its teaser and nothing else. Metadata is served
  // to anyone who pastes the link, including crawlers - it is a body-emitting
  // path like any other, and it does not get to be the one that leaks.
  const preview = secret.isLocked ? (secret.teaser ?? 'A sealed record.') : secret.body;
  const trimmed = preview.length > 180 ? `${preview.slice(0, 177)}…` : preview;
  const mood = MOODS.find((m) => m.id === secret.mood) ?? MOODS[0];

  return {
    title: `${mood.label} · ${recordRef(secret.id)}`,
    description: trimmed,
    openGraph: {
      title: `VaultDrop · ${mood.label}`,
      description: trimmed,
      type: 'article',
    },
    twitter: { card: 'summary_large_image', description: trimmed },
    // A confession should not accumulate search-engine permanence on our say-so.
    robots: { index: false, follow: true },
  };
}

export default async function RecordPage({ params }: Params) {
  const { id } = await params;
  const secret = await load(id);

  if (!secret || secret.hidden) notFound();

  const mood = MOODS.find((m) => m.id === secret.mood) ?? MOODS[0];
  const channel = PALETTES[secret.palette] ?? PALETTES[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-4">
        <Link href="/wall" className="cmd-bare no-underline">
          ← Back to the wall
        </Link>
      </nav>

      <RecordPermalink
        secret={{
          id: secret.id,
          // The server renders a sealed record sealed, whoever is asking. The
          // client re-asks as its own ghost and unseals if it has paid.
          body: secret.isLocked ? null : secret.body,
          teaser: secret.teaser,
          isLocked: secret.isLocked,
          unlocked: !secret.isLocked,
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
        }}
        commentsLocked={secret.commentsLocked}
        commentCount={secret.commentCount}
      />

      <footer className="mt-8 border border-hairline">
        <div className="rec-head">
          <span className="normal-case" style={{ color: channel.hex }}>
            REC {recordRef(secret.id)}
          </span>
          <span>{mood.code}</span>
          <span className="ml-auto" suppressHydrationWarning>
            filed {timeAgo(secret.createdAt.toISOString())}
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm leading-relaxed text-label">
            Nothing on this page identifies whoever wrote it. There is no account behind a record,
            so there is nothing for us to hand over.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/confess" className="cmd no-underline">
              File your own
            </Link>
            <Link href="/how-it-works" className="cmd-bare no-underline">
              How this works →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
