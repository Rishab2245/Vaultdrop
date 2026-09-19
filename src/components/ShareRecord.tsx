'use client';

import { useCallback, useMemo, useState } from 'react';
import { MOODS } from '@/lib/constants';
import { recordRef } from '@/lib/format';
import { renderShareCard, shareCard } from '@/lib/share-card';
import { CopyField } from './CopyField';

/**
 * The distribution loop, such as it is.
 *
 * A card is what travels; the link is how anyone who sees it gets back here.
 * Exporting an image with no address on it was the gap - people screenshot the
 * card, it spreads, and it leads nowhere.
 */
export function ShareRecord({
  secret,
}: {
  secret: {
    id: string;
    body: string | null;
    teaser?: string | null;
    isLocked?: boolean;
    mood: string;
    palette: number;
  };
}) {
  const [state, setState] = useState<'idle' | 'rendering' | 'done'>('idle');

  const ref = useMemo(() => recordRef(secret.id), [secret.id]);
  const mood = useMemo(() => MOODS.find((m) => m.id === secret.mood) ?? MOODS[0], [secret.mood]);

  // Built in the browser so it is right whatever host this is served from -
  // a share link baked at build time points wherever the build thought it was.
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/r/${secret.id}`;

  const onExport = useCallback(async () => {
    setState('rendering');
    try {
      // A sealed record exports its teaser. The card is the most public thing
      // this product makes, so it is the last place a locked body may appear.
      const printable = secret.isLocked ? (secret.teaser ?? '') : (secret.body ?? '');
      const blob = await renderShareCard({
        body: printable,
        mood: mood.label,
        code: mood.code,
        ref,
        palette: secret.palette,
        url,
      });
      await shareCard(blob, `vaultdrop-${ref}.png`, printable);
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('idle');
    }
  }, [mood.code, mood.label, ref, secret.body, secret.isLocked, secret.palette, url]);

  return (
    <section className="border border-hairline">
      <div className="border-b border-hairline bg-panel px-2 py-1">
        <span className="field">Share</span>
      </div>
      <div className="p-3">
        <CopyField value={url} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={state === 'rendering'}
            className="cmd cmd-primary"
          >
            {state === 'rendering' ? 'Rendering…' : state === 'done' ? 'Saved' : 'Export as image'}
          </button>
          <span className="text-2xs uppercase tracking-[0.1em] text-label">
            {secret.isLocked ? 'The card shows the teaser only' : 'The card carries this link'}
          </span>
        </div>
      </div>
    </section>
  );
}
