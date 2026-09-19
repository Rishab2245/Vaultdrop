'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ECONOMY } from '@/lib/economy';
import { recordRef } from '@/lib/format';
import { MOODS, PALETTES } from '@/lib/constants';
import { useGhost } from '@/lib/use-ghost';

export interface LockedSecret {
  id: string;
  body: string | null;
  teaser: string | null;
  isLocked: boolean;
  unlocked: boolean;
  priceKeys: number;
  mood: string;
  palette: number;
  opens: number;
  worthItRate: number | null;
  author: { codename: string; standing: string } | null;
  createdAt: string;
}

type Phase = 'sealed' | 'opening' | 'open' | 'rated' | 'error';

/**
 * A locked record.
 *
 * The teaser is public; the body arrives only from the open endpoint, and only
 * after Keys have actually moved. Nothing here reads a hidden field out of the
 * feed payload, because the feed never contains one.
 */
export function LockedRecord({ secret }: { secret: LockedSecret }) {
  const { keys, setKeys, authedFetch } = useGhost();

  const [phase, setPhase] = useState<Phase>(secret.unlocked ? 'open' : 'sealed');
  const [body, setBody] = useState<string | null>(secret.body);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refunded, setRefunded] = useState(0);

  const mood = MOODS.find((m) => m.id === secret.mood) ?? MOODS[0];
  const channel = PALETTES[secret.palette] ?? PALETTES[0];
  const ref = recordRef(secret.id);

  const open = useCallback(async () => {
    setPhase('opening');
    setMessage(null);

    try {
      const response = await authedFetch(`/api/wall/${secret.id}/open`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? 'Could not open that.');
        setPhase('error');
        return;
      }

      setBody(data.body);
      setOpenId(data.open?.id ?? null);
      if (typeof data.keys === 'number') setKeys(data.keys);
      setPhase(data.open?.verdict ? 'rated' : 'open');
    } catch {
      setMessage('No response from the system.');
      setPhase('error');
    }
  }, [authedFetch, secret.id, setKeys]);

  const rate = useCallback(
    async (verdict: 'worth' | 'not_worth') => {
      if (!openId) return;
      setPhase('rated');

      try {
        const response = await authedFetch(`/api/opens/${openId}/verdict`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ verdict }),
        });
        const data = await response.json();
        if (response.ok) {
          if (typeof data.keys === 'number') setKeys(data.keys);
          setRefunded(data.refunded ?? 0);
        }
      } catch {
        /* the record is read either way; the rating is not worth an error state */
      }
    },
    [authedFetch, openId, setKeys]
  );

  const affordable = keys === null || keys >= secret.priceKeys;

  return (
    <article className="rec">
      <div className="rec-head">
        <Link
          href={`/r/${secret.id}`}
          className="normal-case no-underline hover:underline"
          style={{ color: channel.hex }}
        >
          REC {ref}
        </Link>
        <span>{mood.code}</span>
        <span className="text-amber">SEALED</span>
        <span className="ml-auto tabular">{secret.opens} OPENED</span>
        {secret.worthItRate !== null && (
          <span className="tabular">{secret.worthItRate}% WORTH IT</span>
        )}
      </div>

      {/* The teaser is what everyone gets for free. */}
      <div className="rec-body">
        <p className="prose-human">{secret.teaser}</p>

        {phase !== 'open' && phase !== 'rated' && (
          <div className="mt-3" aria-hidden="true">
            {/* The bar is the honest rendering of a field this client has no key for. */}
            <span className="redact-block" style={{ width: '100%' }} />
            <span className="redact-block" style={{ width: '82%' }} />
            <span className="redact-block" style={{ width: '64%' }} />
          </div>
        )}

        {(phase === 'open' || phase === 'rated') && body && (
          <div className="mt-3 border-t border-hairline pt-3">
            <p className="prose-human">{body}</p>
          </div>
        )}
      </div>

      {/* ---- the verdict prompt: this is what releases escrow ---- */}
      {phase === 'open' && openId && (
        <div className="border-t border-hairline bg-panel px-3 py-2.5">
          <p className="field mb-2">
            Your {secret.priceKeys} {secret.priceKeys === 1 ? 'Key is' : 'Keys are'} held, not paid
            yet
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => rate('worth')} className="cmd cmd-primary">
              Worth it
            </button>
            <button type="button" onClick={() => rate('not_worth')} className="cmd cmd-danger">
              Not worth it
            </button>
            <span className="text-2xs uppercase tracking-[0.1em] text-label">
              Releases to the author, or refunds most of it to you
            </span>
          </div>
        </div>
      )}

      {phase === 'rated' && (
        <div className="rec-foot">
          <span className={refunded > 0 ? 'text-amber' : 'text-sealed'}>
            {refunded > 0 ? `${refunded} KEYS REFUNDED` : 'RELEASED TO AUTHOR'}
          </span>
          <span className="ml-auto">{secret.author?.codename ?? 'ANONYMOUS'}</span>
        </div>
      )}

      {/* ---- the seal ---- */}
      {(phase === 'sealed' || phase === 'opening' || phase === 'error') && (
        <div className="border-t border-hairline bg-panel px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={open}
              disabled={phase === 'opening' || !affordable}
              className="cmd cmd-primary"
            >
              {phase === 'opening'
                ? 'Opening…'
                : `Open for ${secret.priceKeys} ${secret.priceKeys === 1 ? 'Key' : 'Keys'}`}
            </button>

            <span className="text-2xs uppercase tracking-[0.1em] text-label">
              {affordable
                ? `Held for ${ECONOMY.verdictWindowHours}h until you say it was worth it`
                : `You have ${keys} — file a record to earn more`}
            </span>
          </div>

          {message && (
            <p role="alert" className="mt-2 text-sm text-alert">
              {message}
            </p>
          )}
        </div>
      )}

      {secret.author && phase === 'sealed' && (
        <div className="rec-foot">
          <span>{secret.author.codename}</span>
          <span
            className={
              secret.author.standing === 'TRUSTED'
                ? 'text-sealed'
                : secret.author.standing === 'POOR'
                  ? 'text-alert'
                  : ''
            }
          >
            {secret.author.standing}
          </span>
        </div>
      )}
    </article>
  );
}
