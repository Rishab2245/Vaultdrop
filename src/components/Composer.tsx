'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { LIMITS, MOODS, PALETTES } from '@/lib/constants';
import { ECONOMY } from '@/lib/economy';
import { generateCapabilityToken, hashCapabilityToken } from '@/lib/crypto';
import { detectCrisis } from '@/lib/crisis';
import { recordRef } from '@/lib/format';
import { rememberAuthored } from '@/lib/local-vault';
import { renderShareCard, shareCard } from '@/lib/share-card';
import { useGhost } from '@/lib/use-ghost';
import { CrisisNotice } from './CrisisNotice';
import { SecretCard, type WallSecret } from './SecretCard';

export function Composer() {
  const { keys, setKeys, authedFetch, identity } = useGhost();

  const [body, setBody] = useState('');
  const [teaser, setTeaser] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [priceKeys, setPriceKeys] = useState(3);
  const [mood, setMood] = useState<string>(MOODS[0].id);
  const [palette, setPalette] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<WallSecret | null>(null);
  const [redactions, setRedactions] = useState(0);
  const [isRepost, setIsRepost] = useState(false);
  const [earned, setEarned] = useState<number | null>(null);

  const remaining = LIMITS.wallBodyMax - body.length;
  const tooShort = body.trim().length < LIMITS.wallBodyMin;
  const teaserTooShort = isLocked && teaser.trim().length < LIMITS.wallBodyMin;
  const canSubmit = !tooShort && !teaserTooShort && remaining >= 0 && !submitting;

  const selectedMood = useMemo(() => MOODS.find((m) => m.id === mood) ?? MOODS[0], [mood]);

  // Runs as they type, on this device only. Nothing is sent anywhere to decide
  // whether to show it.
  const crisis = useMemo(() => detectCrisis(`${body} ${teaser}`), [body, teaser]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const token = generateCapabilityToken();
      const authorTokenHash = await hashCapabilityToken(token);

      const payload = {
        body,
        mood,
        palette,
        authorTokenHash,
        ...(isLocked ? { isLocked: true, teaser, priceKeys } : {}),
      };

      // authedFetch mints a ghost on demand. A locked record needs one so
      // there is somebody for the Keys to reach; a public record earns its
      // filing reward the same way, and the server accepts it either way.
      const response = await authedFetch('/api/wall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Rejected.');
        return;
      }

      rememberAuthored({
        id: data.secret.id,
        token,
        body: data.secret.body ?? data.secret.teaser ?? '',
        mood: data.secret.mood,
        palette: data.secret.palette,
        createdAt: data.secret.createdAt,
      });

      setRedactions(data.redactions ?? 0);
      setIsRepost(Boolean(data.isRepost));
      if (typeof data.keys === 'number') {
        setKeys(data.keys);
        setEarned(ECONOMY.fileReward);
      }
      setPosted(data.secret);
    } catch {
      setError('No response from the system. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  }, [authedFetch, body, canSubmit, isLocked, mood, palette, priceKeys, setKeys, teaser]);

  const onShare = useCallback(async () => {
    if (!posted) return;
    const ref = recordRef(posted.id);
    const blob = await renderShareCard({
      body: posted.body ?? posted.teaser ?? '',
      mood: selectedMood.label,
      code: selectedMood.code,
      ref,
      palette,
    });
    await shareCard(blob, `vaultdrop-${ref}.png`, posted.body ?? '');
  }, [palette, posted, selectedMood]);

  if (posted) {
    return (
      <div className="space-y-4">
        <div className="border border-sealed/40 px-4 py-4">
          <span className="stamp">Filed</span>
          <span className="ml-2 text-2xs text-label">REC {recordRef(posted.id)}</span>

          <p className="mt-3 text-sm leading-relaxed text-body">
            {isLocked
              ? 'Sealed and on the Wall. You earn Keys when someone opens it and says it was worth reading.'
              : 'The record is on the Wall. Nothing in it connects to you.'}{' '}
            You can destroy it from{' '}
            <Link href="/vault" className="text-amber no-underline hover:underline">
              your vault
            </Link>
            .
          </p>

          {earned !== null && (
            <p className="notice-sealed mt-3">
              +{earned} {earned === 1 ? 'Key' : 'Keys'} for an original record. Balance: {keys}.
            </p>
          )}

          {isRepost && (
            <p className="notice-alert mt-3">
              This reads as a repost of something already on the Wall, so it earned no Keys. It is
              still published.
            </p>
          )}

          {redactions > 0 && (
            <p className="notice-sealed mt-3">
              {redactions} {redactions === 1 ? 'field was' : 'fields were'} redacted before filing.
              Anonymity is worth very little if the text points at someone.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onShare} className="cmd cmd-primary">
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
      {/* Shown the moment it matches, above everything, before they submit. */}
      {crisis && <CrisisNotice signal={crisis} />}

      <div className="border border-hairline">
        <div className="flex items-center justify-between border-b border-hairline bg-panel px-2 py-1">
          <span className="field">{isLocked ? 'Sealed record' : 'New record'}</span>
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
            {tooShort ? `Min ${LIMITS.wallBodyMin} chars` : isLocked ? 'Sealed' : 'Public · permanent'}
          </span>
          <span className={`field tabular ${remaining < 0 ? 'text-alert' : ''}`}>{remaining}</span>
        </div>
      </div>

      {/* ---- the Exchange ---- */}
      <div className="border border-hairline">
        <div className="flex items-center justify-between border-b border-hairline bg-panel px-2 py-1">
          <span className="field">Exchange</span>
          {keys !== null && <span className="field tabular">{keys} KEYS</span>}
        </div>

        <div className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLocked(false)}
              aria-pressed={!isLocked}
              className="tag"
            >
              Public · free
            </button>
            <button
              type="button"
              onClick={() => setIsLocked(true)}
              aria-pressed={isLocked}
              className="tag"
            >
              Sealed · costs Keys to open
            </button>
          </div>

          <p className="mt-2.5 text-sm leading-relaxed text-label">
            {isLocked
              ? 'Only the teaser is public. Readers spend Keys to see the rest, and you are paid once they confirm it was worth reading - not when they open it.'
              : `Free to read. Earns you ${ECONOMY.fileReward} Key if it is not a repost.`}
          </p>

          {isLocked && (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="teaser" className="field mb-1.5 block">
                  Teaser · what everyone sees
                </label>
                <textarea
                  id="teaser"
                  value={teaser}
                  onChange={(e) => setTeaser(e.target.value)}
                  rows={2}
                  maxLength={LIMITS.wallBodyMax}
                  placeholder="Enough to know whether it is worth their Keys. Not enough to guess it."
                  className="input-human min-h-[64px] resize-none"
                />
                {teaserTooShort && (
                  <p className="mt-1 text-2xs uppercase tracking-[0.1em] text-label">
                    Min {LIMITS.wallBodyMin} chars
                  </p>
                )}
              </div>

              <div>
                <span className="field mb-1.5 block">
                  Price · {priceKeys} {priceKeys === 1 ? 'Key' : 'Keys'}
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(
                    { length: ECONOMY.maxPrice - ECONOMY.minPrice + 1 },
                    (_, i) => i + ECONOMY.minPrice
                  ).map((price) => (
                    <button
                      key={price}
                      type="button"
                      onClick={() => setPriceKeys(price)}
                      aria-pressed={priceKeys === price}
                      className="tag tabular"
                    >
                      {price}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-label">
                  Price it honestly. A record people open and regret costs you reputation and pays
                  you nothing.
                </p>
              </div>
            </div>
          )}
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
        <button type="button" onClick={submit} disabled={!canSubmit} className="cmd cmd-primary">
          {submitting ? 'Filing…' : isLocked ? 'Seal and file' : 'File record'}
        </button>
        <p className="text-2xs uppercase tracking-[0.1em] text-label">
          {identity ? identity.codename : 'Contact details stripped · threats refused'}
        </p>
      </div>
    </div>
  );
}
