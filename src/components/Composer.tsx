'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { LIMITS, MOODS, PALETTES } from '@/lib/constants';
import { generateCapabilityToken, hashCapabilityToken } from '@/lib/crypto';
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

  const moodLabel = useMemo(
    () => MOODS.find((m) => m.id === mood)?.label ?? MOODS[0].label,
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
        setError(data.error ?? 'That did not go through.');
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
      setError('Could not reach the server. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  }, [body, canSubmit, mood, palette]);

  const onShare = useCallback(async () => {
    if (!posted) return;
    const blob = await renderShareCard({ body: posted.body, mood: moodLabel, palette });
    await shareCard(blob, `vaultdrop-${posted.id}.png`, posted.body);
  }, [moodLabel, palette, posted]);

  if (posted) {
    return (
      <div className="space-y-6">
        <div className="panel p-6 text-center">
          <p className="text-lg font-medium">It is on the Wall.</p>
          <p className="mt-1 text-sm text-chalk-dim">
            Nothing connects it to you. You can delete it from{' '}
            <Link href="/vault" className="text-violet-soft underline underline-offset-4">
              your vault
            </Link>{' '}
            as long as this browser remembers it.
          </p>

          {redactions > 0 && (
            <p className="mt-4 rounded-2xl border border-mint/25 bg-mint/10 p-3 text-sm text-mint">
              We removed {redactions} {redactions === 1 ? 'contact detail' : 'contact details'}{' '}
              before posting. Anonymity is worth very little if the text points at someone.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onShare} className="btn-primary">
              Share as an image
            </button>
            <Link href="/wall" className="btn-ghost">
              See the Wall
            </Link>
          </div>
        </div>

        <SecretCard secret={posted} priority />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5 sm:p-6">
        <label htmlFor="confession" className="label">
          Your secret
        </label>
        <textarea
          id="confession"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="The thing you have never typed anywhere with your name attached."
          rows={6}
          maxLength={LIMITS.wallBodyMax + 200}
          className="field mt-2 min-h-[160px] resize-none text-[17px] leading-relaxed"
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-chalk-faint">
            {tooShort ? `At least ${LIMITS.wallBodyMin} characters.` : 'Public and permanent.'}
          </span>
          <span className={remaining < 0 ? 'text-ember' : 'text-chalk-faint'}>{remaining}</span>
        </div>
      </div>

      <div className="panel p-5 sm:p-6">
        <p className="label">Mood</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMood(m.id)}
              aria-pressed={mood === m.id}
              className={`chip ${mood === m.id ? 'chip-active' : ''}`}
            >
              <span aria-hidden="true">{m.glyph}</span>
              {m.label}
            </button>
          ))}
        </div>

        <p className="label mt-6">Card colour</p>
        <p className="mt-1 text-xs text-chalk-faint">Used when someone shares this as an image.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PALETTES.map((p, index) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setPalette(index)}
              aria-label={p.name}
              aria-pressed={palette === index}
              className={`h-9 w-9 rounded-xl transition-all ${
                palette === index
                  ? 'ring-2 ring-violet ring-offset-2 ring-offset-ink-900'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
            />
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-ember/40 bg-ember/10 p-4 text-sm text-ember">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={!canSubmit} className="btn-primary">
          {submitting ? 'Posting…' : 'Post anonymously'}
        </button>
        <p className="text-xs text-chalk-faint">
          Contact details get stripped automatically. Threats and doxxing are refused.
        </p>
      </div>
    </div>
  );
}
