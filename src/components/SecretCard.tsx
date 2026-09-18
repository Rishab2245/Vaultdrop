'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MOODS, PALETTES, REACTIONS, REPORT_REASONS } from '@/lib/constants';
import { compactNumber, recordRef, timeAgo } from '@/lib/format';
import { getReactions, toggleReaction } from '@/lib/local-vault';
import { renderShareCard, shareCard } from '@/lib/share-card';
import { SameThread } from './SameThread';

export interface WallSecret {
  id: string;
  /** Null only for a locked record, which LockedRecord renders instead. */
  body: string | null;
  teaser?: string | null;
  isLocked?: boolean;
  unlocked?: boolean;
  priceKeys?: number;
  mood: string;
  palette: number;
  reactions: { felt: number; hug: number; whoa: number; same: number };
  views: number;
  opens?: number;
  worthItRate?: number | null;
  author?: { codename: string; standing: string } | null;
  createdAt: string;
}

type ReactionCounts = WallSecret['reactions'];

/**
 * One record on the Wall.
 *
 * The frame is the system talking: reference, classification, age, counters,
 * all monospace and tabular. The body is the only thing set in serif, because
 * it is the only thing a person wrote.
 */
export function SecretCard({ secret }: { secret: WallSecret; priority?: boolean }) {
  const [counts, setCounts] = useState<ReactionCounts>(secret.reactions);
  const [mine, setMine] = useState<string[]>([]);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Read local state after mount so the server and client markup agree.
  useEffect(() => setMine(getReactions(secret.id)), [secret.id]);

  const mood = useMemo(() => MOODS.find((m) => m.id === secret.mood) ?? MOODS[0], [secret.mood]);
  const channel = PALETTES[secret.palette] ?? PALETTES[0];
  const ref = useMemo(() => recordRef(secret.id), [secret.id]);

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
        body: secret.body ?? '',
        mood: mood.label,
        code: mood.code,
        ref,
        palette: secret.palette,
      });
      await shareCard(blob, `vaultdrop-${ref}.png`, secret.body ?? '');
    } catch {
      // Canvas unavailable; nothing useful to say beyond letting the control reset.
    } finally {
      setSharing(false);
    }
  }, [mood.code, mood.label, ref, secret.body, secret.palette]);

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
      <article className="rec">
        <div className="rec-head">
          <span className="normal-case">REC {ref}</span>
          <span className="text-alert">FLAGGED</span>
        </div>
        <div className="rec-body text-sm text-label">
          Reported. Flagged records are reviewed, and hidden automatically once several people
          agree.
        </div>
      </article>
    );
  }

  return (
    <article className="rec">
      <div className="rec-head">
        <span className="normal-case" style={{ color: channel.hex }}>
          REC {ref}
        </span>
        <span>{mood.code}</span>
        {secret.author && <span>{secret.author.codename}</span>}
        {/* A relative timestamp is computed from the clock, so the server's
            value and the browser's differ by however long the response took.
            The difference is the correct behaviour, not a bug to reconcile. */}
        <span className="ml-auto" suppressHydrationWarning>
          {timeAgo(secret.createdAt)}
        </span>
        {secret.views > 0 && <span>{compactNumber(secret.views)} READ</span>}
      </div>

      <div className="rec-body">
        <p className="prose-human">{secret.body}</p>
      </div>

      <div className="rec-foot">
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
              className="tally"
            >
              {reaction.code} {compactNumber(count)}
            </button>
          );
        })}

        <span className="ml-auto flex items-center gap-1">
          {secret.author && <SameThread secretId={secret.id} />}
          <button
            type="button"
            onClick={onShare}
            disabled={sharing}
            className="cmd-bare"
            aria-label="Export this record as an image"
          >
            {sharing ? 'RENDERING' : 'EXPORT'}
          </button>
          <button
            type="button"
            onClick={() => setReporting((v) => !v)}
            className="cmd-bare"
            aria-expanded={reporting}
            aria-label="Flag this record"
          >
            FLAG
          </button>
        </span>
      </div>

      {reporting && (
        <div className="border-t border-hairline bg-panel px-2 py-2">
          <p className="field mb-1.5">Reason for flag</p>
          <div className="flex flex-wrap gap-1">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason.id}
                type="button"
                onClick={() => onReport(reason.id)}
                className="tag cmd-danger"
              >
                {reason.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
