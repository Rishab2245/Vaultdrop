import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { MOODS, PALETTES } from '@/lib/constants';
import { standingOf, worthItRate } from '@/lib/economy';
import { compactNumber, recordRef } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Standing',
  description: 'Ghosts ranked by what people confirmed was worth reading, and the records that earned it.',
};

const LIMIT = 10;

async function load() {
  const [ghosts, records] = await Promise.all([
    prisma.ghost.findMany({
      where: { opensReceived: { gt: 0 } },
      select: { codename: true, opensReceived: true, worthItCount: true, notWorthCount: true },
      orderBy: { opensReceived: 'desc' },
      take: 200,
    }),
    prisma.wallSecret.findMany({
      where: { hidden: false },
      select: {
        id: true, body: true, teaser: true, isLocked: true, mood: true, palette: true,
        reactFelt: true, reactHug: true, reactWhoa: true, reactSame: true,
        opensCount: true, worthItCount: true, notWorthCount: true, commentCount: true,
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
    .filter((g) => g.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0) || b.opens - a.opens)
    .slice(0, LIMIT);

  const hall = records
    .map((r) => ({
      r,
      score:
        r.reactHug * 2 + r.reactFelt * 1.5 + r.reactWhoa * 1.2 + r.reactSame +
        r.worthItCount * 4 + r.commentCount * 1.5,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, LIMIT);

  return { ranked, hall };
}

export default async function LeaderboardPage() {
  const { ranked, hall } = await load();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-[2rem] leading-tight text-chrome">Standing</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
          Ranked by the share of opens that people confirmed were worth reading &mdash; never by
          how much anyone posts. Ranking by volume would reward filing constantly, which is the
          exact behaviour the Exchange exists to make unprofitable.
        </p>
      </header>

      {/* ---- ghosts ---- */}
      <section className="border border-hairline">
        <div className="rec-head">
          <span>GHOSTS BY STANDING</span>
          <span className="ml-auto hidden sm:inline">MIN 3 RATINGS TO RANK</span>
        </div>

        {ranked.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-label">
              Nobody has been rated three times yet. Seal a record and find out.
            </p>
            <Link href="/confess" className="cmd cmd-primary mt-4 no-underline">
              File a record
            </Link>
          </div>
        ) : (
          <ol className="divide-y divide-hairline">
            {ranked.map((g, i) => (
              <li key={g.codename} className="flex items-start gap-3 px-3 py-2.5">
                <span className="tabular w-6 shrink-0 pt-0.5 text-2xs text-label">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <span className="block truncate text-base text-chrome">{g.codename}</span>
                  {/* Metrics sit under the codename on a phone and inline on a
                      desktop. Four fixed columns do not survive 375px. */}
                  <span className="mt-0.5 flex flex-wrap items-baseline gap-x-3 text-2xs uppercase tracking-[0.1em] sm:hidden">
                    <span className="tabular text-amber">{g.rate}% worth it</span>
                    <span className="tabular text-label">{compactNumber(g.opens)} read</span>
                  </span>
                </div>

                <span
                  className={`shrink-0 pt-0.5 text-2xs uppercase tracking-[0.1em] ${
                    g.standing === 'TRUSTED'
                      ? 'text-sealed'
                      : g.standing === 'POOR'
                        ? 'text-alert'
                        : 'text-label'
                  }`}
                >
                  {g.standing}
                </span>
                <span className="tabular hidden w-12 shrink-0 text-right text-base text-amber sm:block">
                  {g.rate}%
                </span>
                <span className="tabular hidden w-16 shrink-0 text-right text-2xs text-label sm:block">
                  {compactNumber(g.opens)} READ
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ---- hall of fame ---- */}
      <section className="mt-4 border border-hairline">
        <div className="rec-head">
          <span>HALL OF FAME</span>
          <span className="ml-auto hidden sm:inline">RECORDS PEOPLE ANSWERED</span>
        </div>

        {hall.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-label">
            Nothing has been reacted to yet.
          </p>
        ) : (
          <ol className="divide-y divide-hairline">
            {hall.map(({ r }, i) => {
              const mood = MOODS.find((m) => m.id === r.mood) ?? MOODS[0];
              const channel = PALETTES[r.palette] ?? PALETTES[0];
              const rate = worthItRate(r.worthItCount, r.notWorthCount);
              // A sealed record shows its teaser. A leaderboard is one more
              // path that can emit a body, and it does not get to be the leak.
              const preview = r.isLocked ? (r.teaser ?? '') : r.body;

              return (
                <li key={r.id}>
                  <Link href={`/r/${r.id}`} className="block no-underline hover:bg-panel">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-2 text-2xs uppercase tracking-[0.1em] text-label">
                      <span className="tabular w-6">{String(i + 1).padStart(2, '0')}</span>
                      <span className="normal-case" style={{ color: channel.hex }}>
                        REC {recordRef(r.id)}
                      </span>
                      <span>{mood.code}</span>
                      {r.isLocked && <span className="text-amber">SEALED</span>}
                      <span className="tabular ml-auto">
                        {compactNumber(r.reactFelt + r.reactHug + r.reactWhoa + r.reactSame)} REACTED
                      </span>
                      {rate !== null && (
                        <span className="tabular hidden sm:inline">{rate}% WORTH IT</span>
                      )}
                    </div>
                    <p className="clamp-2 px-3 pb-2.5 pt-1.5 font-serif text-base leading-relaxed text-body">
                      {preview}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
