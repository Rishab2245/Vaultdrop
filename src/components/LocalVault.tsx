'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { MOODS } from '@/lib/constants';
import { hashCapabilityToken } from '@/lib/crypto';
import { timeAgo, timeUntil } from '@/lib/format';
import {
  forgetAuthored,
  forgetDrop,
  getAuthored,
  getDrops,
  wipeEverything,
  type AuthoredSecret,
  type StoredDrop,
} from '@/lib/local-vault';

export function LocalVault() {
  const [authored, setAuthored] = useState<AuthoredSecret[]>([]);
  const [drops, setDrops] = useState<StoredDrop[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    setAuthored(getAuthored());
    setDrops(getDrops());
    setHydrated(true);
  }, []);

  const deleteSecret = useCallback(async (secret: AuthoredSecret) => {
    setAuthored((prev) => prev.filter((s) => s.id !== secret.id));
    forgetAuthored(secret.id);
    try {
      await fetch(`/api/wall/${secret.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ authorTokenHash: await hashCapabilityToken(secret.token) }),
      });
    } catch {
      /* removed locally; the server copy can be retried from a later session */
    }
  }, []);

  const removeDrop = useCallback((id: string) => {
    forgetDrop(id);
    setDrops((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const wipe = useCallback(() => {
    wipeEverything();
    setAuthored([]);
    setDrops([]);
    setConfirmWipe(false);
  }, []);

  if (!hydrated) return <div className="skeleton h-64" aria-label="Loading" />;

  const empty = authored.length === 0 && drops.length === 0;

  return (
    <div className="space-y-10">
      {empty && (
        <div className="panel p-12 text-center">
          <p className="text-chalk-dim">This browser has no VaultDrop history.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/confess" className="btn-primary">
              Confess something
            </Link>
            <Link href="/drop" className="btn-ghost">
              Send a drop
            </Link>
          </div>
        </div>
      )}

      {authored.length > 0 && (
        <section>
          <h2 className="label mb-4">Posted to the Wall</h2>
          <div className="space-y-3">
            {authored.map((secret) => {
              const mood = MOODS.find((m) => m.id === secret.mood) ?? MOODS[0];
              return (
                <article key={secret.id} className="panel p-5">
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-chalk">
                    {secret.body}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-chalk-faint">
                    <span>
                      {mood.glyph} {mood.label} · {timeAgo(secret.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void deleteSecret(secret)}
                      className="btn-quiet text-ember"
                    >
                      Delete from the Wall
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {drops.length > 0 && (
        <section>
          <h2 className="label mb-4">Private drops you sent</h2>
          <div className="space-y-3">
            {drops.map((drop) => (
              <article key={drop.id} className="panel p-5">
                <p className="truncate font-mono text-xs text-chalk-dim">{drop.note || drop.id}</p>
                <p className="mt-2 break-all font-mono text-[11px] text-chalk-faint">{drop.url}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-chalk-faint">
                  <span>
                    {drop.burnAfterRead ? 'One-time · ' : ''}
                    Expires in {timeUntil(drop.expiresAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDrop(drop.id)}
                    className="btn-quiet"
                  >
                    Forget
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-chalk-faint">
            Forgetting a drop only clears it from this list. It still expires on its own schedule.
          </p>
        </section>
      )}

      {!empty && (
        <section className="panel p-5">
          <h2 className="text-sm font-medium text-chalk">Erase everything</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-chalk-faint">
            Clears this browser&apos;s history, reaction memory, drop links, and inbox keys. Wall
            posts stay up - deleting them individually is the only way, and only from here.
          </p>
          {confirmWipe ? (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={wipe} className="btn-primary bg-ember text-xs hover:bg-ember/80">
                Yes, erase it all
              </button>
              <button type="button" onClick={() => setConfirmWipe(false)} className="btn-ghost text-xs">
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmWipe(true)}
              className="btn-ghost mt-4 text-xs text-ember"
            >
              Erase this browser
            </button>
          )}
        </section>
      )}
    </div>
  );
}
