'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { LIMITS, MOODS, PALETTES } from '@/lib/constants';
import { generateCapabilityToken, hashCapabilityToken } from '@/lib/crypto';
import { recordRef } from '@/lib/format';
import { rememberAuthored } from '@/lib/local-vault';
import { renderShareCard, shareCard } from '@/lib/share-card';
import { SecretCard, type WallSecret } from './SecretCard';

export function Composer() {
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<string>(MOODS[0].id);
  const [palette, setPalette] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<WallSecret | null>(null);
  const [redactions, setRedactions] = useState(0);

  const remaining = LIMITS.wallBodyMax - body.length;
  const tooShort = body.trim().length < LIMITS.wallBodyMin;
  const canSubmit = !tooShort && remaining >= 0 && !submitting;

  const selectedMood = useMemo(
    () => MOODS.find((m) => m.id === mood) ?? MOODS[0],
    [mood]
  );

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      // The token proves authorship later without ever identifying the author;
      // only its hash leaves this browser.
      const token = generateCapabilityToken();
      const authorTokenHash = await hashCapabilityToken(token);

      const response = await fetch('/api/wall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, mood, palette, authorTokenHash }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Rejected.');
        return;
      }

      rememberAuthored({
        id: data.secret.id,
        token,
        body: data.secret.body,
        mood: data.secret.mood,
        palette: data.secret.palette,
        createdAt: data.secret.createdAt,
      });

      setRedactions(data.redactions ?? 0);
      setPosted(data.secret);
    } catch {
      setError('No response from the system. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  }, [body, canSubmit, mood, palette]);

  const onShare = useCallback(async () => {
    if (!posted) return;
    const blob = await renderShareCard({
      body: posted.body,
      mood: selectedMood.label,
      code: selectedMood.code,
      ref: recordRef(posted.id),
      palette,
    });
    await shareCard(blob, `vaultdrop-${recordRef(posted.id)}.png`, posted.body);
  }, [palette, posted, selectedMood]);

  if (posted) {
    return (
      <div className="space-y-4">
        <div className="border border-sealed/40 px-4 py-4">
          <span className="stamp">Filed</span>
          <span className="ml-2 text-2xs text-label">REC {recordRef(posted.id)}</span>
          <p className="mt-3 text-sm leading-relaxed text-body">
            The record is on the Wall. Nothing in it connects to you. You can destroy it from{' '}
            <Link href="/vault" className="text-amber no-underline hover:underline">
              your vault
            </Link>{' '}
            for as long as this browser remembers the token.
          </p>

          {redactions > 0 && (
            <p className="notice-sealed mt-3">
              {redactions} {redactions === 1 ? 'field was' : 'fields were'} redacted before filing.
              Anonymity is worth very little if the text points at someone.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onShare} className="cmd-primary">
              Export as image
            </button>
            <Link href="/wall" className="cmd no-underline">
              Return to wall
            </Link>
          </div>
        </div>

        <SecretCard secret={posted} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-hairline">
        <div className="flex items-center justify-between border-b border-hairline bg-panel px-2 py-1">
          <span className="field">New record</span>
          <span className="field">{selectedMood.code}</span>
        </div>
        <div className="p-3">
          <label htmlFor="confession" className="sr-only">
            Your secret
          </label>
          <textarea
            id="confession"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="The thing you have never typed anywhere with your name attached."
            rows={7}
            maxLength={LIMITS.wallBodyMax + 200}
            className="input-human min-h-[170px] resize-none border-0 bg-transparent p-0 focus:border-0"
          />
        </div>
        <div className="flex items-center justify-between border-t border-hairline px-2 py-1">
          <span className="field">
            {tooShort ? `Min ${LIMITS.wallBodyMin} chars` : 'Public · permanent'}
          </span>
          <span className={`field tabular ${remaining < 0 ? 'text-alert' : ''}`}>{remaining}</span>
        </div>
      </div>

      <div className="border border-hairline">
        <div className="border-b border-hairline bg-panel px-2 py-1">
          <span className="field">Classification</span>
        </div>
        <div className="flex flex-wrap gap-1 p-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMood(m.id)}
              aria-pressed={mood === m.id}
              className="tag"
            >
              {m.code} · {m.label}
            </button>
          ))}
        </div>

        <div className="border-t border-hairline bg-panel px-2 py-1">
          <span className="field">Channel</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-2">
          {PALETTES.map((p, index) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setPalette(index)}
              aria-label={p.name}
              aria-pressed={palette === index}
              className={`h-6 w-6 border ${
                palette === index ? 'border-chrome' : 'border-transparent'
              }`}
              style={{ background: p.hex }}
            />
          ))}
          <span className="field ml-1">Used on the exported card</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="notice-alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={!canSubmit} className="cmd-primary">
          {submitting ? 'Filing…' : 'File record'}
        </button>
        <p className="text-2xs uppercase tracking-[0.1em] text-label">
          Contact details are stripped · threats refused
        </p>
      </div>
    </div>
  );
}
