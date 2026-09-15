'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MOODS, PALETTES, REACTIONS, REPORT_REASONS } from '@/lib/constants';
import { compactNumber, timeAgo } from '@/lib/format';
import { getReactions, toggleReaction } from '@/lib/local-vault';
import { renderShareCard, shareCard } from '@/lib/share-card';

export interface WallSecret {
  id: string;
  body: string;
  mood: string;
  palette: number;
  reactions: { felt: number; hug: number; whoa: number; same: number };
  views: number;
  createdAt: string;
}

type ReactionCounts = WallSecret['reactions'];

export function SecretCard({ secret, priority = false }: { secret: WallSecret; priority?: boolean }) {
  const [counts, setCounts] = useState<ReactionCounts>(secret.reactions);
  const [mine, setMine] = useState<string[]>([]);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Read local state after mount so the server and client markup agree.
  useEffect(() => setMine(getReactions(secret.id)), [secret.id]);

  const mood = useMemo(() => MOODS.find((m) => m.id === secret.mood) ?? MOODS[0], [secret.mood]);
  const palette = PALETTES[secret.palette] ?? PALETTES[0];

  const react = useCallback(
    async (reactionId: string) => {
      const nowActive = toggleReaction(secret.id, reactionId);
      setMine((prev) => (nowActive ? [...prev, reactionId] : prev.filter((r) => r !== reactionId)));

      const key = reactionId as keyof ReactionCounts;
      setCounts((prev) => ({ ...prev, [key]: Math.max(0, prev[key] + (nowActive ? 1 : -1)) }));

      try {
        const response = await fetch(`/api/wall/${secret.id}/react`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reaction: reactionId, undo: !nowActive }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.reactions) setCounts(data.reactions);
        }
      } catch {
        // Offline or blocked. The optimistic count stands; it reconciles on reload.
      }
    },
    [secret.id]
  );

  const onShare = useCallback(async () => {
    setSharing(true);
    try {
      const blob = await renderShareCard({
        body: secret.body,
        mood: mood.label,
        palette: secret.palette,
      });
      await shareCard(blob, `vaultdrop-${secret.id}.png`, secret.body);
    } catch {
      // Canvas unavailable; nothing useful to say beyond letting the button reset.
    } finally {
      setSharing(false);
    }
  }, [mood.label, secret.body, secret.id, secret.palette]);

  const onReport = useCallback(
    async (reason: string) => {
      setReporting(false);
      setReported(true);
      try {
        await fetch(`/api/wall/${secret.id}/report`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
      } catch {
        /* the acknowledgement is for the reporter, not the server */
      }
    },
    [secret.id]
  );

  if (reported) {
    return (
      <article className="panel flex min-h-[180px] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-chalk-dim">Reported. Thank you.</p>
        <p className="text-xs text-chalk-faint">We look at everything that gets flagged.</p>
      </article>
    );
  }

  return (
    <article
      className="group relative animate-fade-up overflow-hidden rounded-xl2 border border-ink-700/70 bg-ink-900/60 backdrop-blur-xl transition-colors hover:border-ink-600"
      style={priority ? undefined : { animationDelay: '60ms' }}
    >
      {/* The palette shows as a spine rather than a fill, so the wall stays calm
          while each secret keeps the colour it will have as a share card. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `linear-gradient(${palette.from}, ${palette.to})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: palette.from }}
      />

      <div className="relative p-5 pl-6 sm:p-6 sm:pl-7">
        <div className="mb-3 flex items-center gap-2 text-xs text-chalk-faint">
          <span aria-hidden="true">{mood.glyph}</span>
          <span className="font-medium text-chalk-dim">{mood.label}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={secret.createdAt}>{timeAgo(secret.createdAt)}</time>
          {secret.views > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{compactNumber(secret.views)} read</span>
            </>
          )}
        </div>

        <p className="whitespace-pre-wrap text-pretty text-[17px] leading-relaxed text-chalk sm:text-lg">
          {secret.body}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {REACTIONS.map((reaction) => {
            const active = mine.includes(reaction.id);
            const count = counts[reaction.id as keyof ReactionCounts];
            return (
              <button
                key={reaction.id}
                type="button"
                onClick={() => react(reaction.id)}
                aria-pressed={active}
                aria-label={`${reaction.label}${count ? `, ${count}` : ''}`}
                className={`chip ${active ? 'chip-active' : ''}`}
              >
                <span aria-hidden="true">{reaction.glyph}</span>
                <span className="hidden sm:inline">{reaction.label}</span>
                {count > 0 && <span className="tabular-nums">{compactNumber(count)}</span>}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onShare}
              disabled={sharing}
              className="btn-quiet"
              aria-label="Share as an image"
            >
              {sharing ? 'Rendering…' : 'Share'}
            </button>
            <button
              type="button"
              onClick={() => setReporting((v) => !v)}
              className="btn-quiet"
              aria-expanded={reporting}
              aria-label="Report this secret"
            >
              Report
            </button>
          </div>
        </div>

        {reporting && (
          <div className="mt-4 rounded-2xl border border-ink-700 bg-ink-950/60 p-3">
            <p className="label mb-2">Why are you reporting this?</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => onReport(reason.id)}
                  className="chip hover:border-ember/50 hover:text-ember"
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
