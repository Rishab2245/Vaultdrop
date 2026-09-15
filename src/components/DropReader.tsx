'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { openLinkDrop, type SealedPayload } from '@/lib/crypto';
import { timeUntil } from '@/lib/format';

interface DropMeta {
  burnAfterRead: boolean;
  needsPassphrase: boolean;
  expiresAt: string;
}

type Stage = 'loading' | 'ready' | 'opening' | 'passphrase' | 'revealed' | 'gone' | 'error';

export function DropReader({ id }: { id: string }) {
  const [stage, setStage] = useState<Stage>('loading');
  const [meta, setMeta] = useState<DropMeta | null>(null);
  const [linkKey, setLinkKey] = useState<string | null>(null);
  const [payload, setPayload] = useState<SealedPayload | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [plaintext, setPlaintext] = useState('');
  const [burned, setBurned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The fragment is the key. It is available to this script and to nothing
    // else - it was never part of the request that loaded this page.
    const fragment = window.location.hash.replace(/^#/, '').trim();
    setLinkKey(fragment || null);

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/drops/${id}`);
        if (cancelled) return;
        if (!response.ok) {
          setStage('gone');
          return;
        }
        setMeta(await response.json());
        setStage('ready');
      } catch {
        if (!cancelled) setStage('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const decrypt = useCallback(
    async (stamp: SealedPayload, phrase?: string) => {
      if (!linkKey) {
        setError('This link is missing its key. It was probably truncated when it was shared.');
        setStage('error');
        return;
      }
      try {
        setPlaintext(await openLinkDrop(stamp, linkKey, phrase));
        setStage('revealed');
        setError(null);
      } catch {
        if (stamp.passwordSalt) {
          setError(phrase ? 'That passphrase did not work.' : null);
          setStage('passphrase');
        } else {
          setError('This link does not match the drop. Check it was copied in full.');
          setStage('error');
        }
      }
    },
    [linkKey]
  );

  const open = useCallback(async () => {
    setStage('opening');
    setError(null);
    try {
      const response = await fetch(`/api/drops/${id}/open`, { method: 'POST' });
      if (!response.ok) {
        setStage('gone');
        return;
      }
      const data = await response.json();
      const stamp: SealedPayload = {
        ciphertext: data.ciphertext,
        iv: data.iv,
        ...(data.passwordSalt ? { passwordSalt: data.passwordSalt } : {}),
      };

      // Held in memory so a wrong passphrase can be retried without another
      // request - which matters, because a burn drop no longer exists server-side.
      setPayload(stamp);
      setBurned(Boolean(data.burned));
      await decrypt(stamp, undefined);
    } catch {
      setStage('error');
      setError('Could not reach the server.');
    }
  }, [decrypt, id]);

  if (stage === 'loading') {
    return <div className="skeleton h-64" aria-label="Loading" />;
  }

  if (stage === 'gone') {
    return (
      <div className="border border-hairline p-10 text-center">
        <p className="text-2xl">🕳</p>
        <h1 className="mt-4 text-xl font-semibold">This drop is gone</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-body">
          It was opened already, or it expired. One-time drops really are one time - there is no
          copy anywhere, including ours.
        </p>
        <Link href="/drop" className="cmd-primary mt-6">
          Send one of your own
        </Link>
      </div>
    );
  }

  if (stage === 'revealed') {
    return (
      <div className="space-y-5">
        <div className="border border-hairline overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-hairline/70 px-5 py-3">
            <div className="stamp">Decrypted on your device</div>
            {burned && <span className="text-xs text-alert">Destroyed - this was the only read</span>}
          </div>
          <pre className="whitespace-pre-wrap break-words p-5 font-mono text-sm leading-relaxed text-chrome">
            {plaintext}
          </pre>
        </div>

        <p className="text-sm text-label">
          {burned
            ? 'Copy anything you need now. Refreshing this page will not bring it back.'
            : 'This drop can still be opened until it expires.'}
        </p>

        <Link href="/drop" className="cmd">
          Send one back
        </Link>
      </div>
    );
  }

  if (stage === 'passphrase') {
    return (
      <div className="border border-hairline p-6">
        <div className="stamp mb-4">Passphrase required</div>
        <h1 className="text-xl font-semibold">One more thing</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-body">
          The sender added a passphrase. They will have shared it separately - we never had it.
        </p>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (payload) void decrypt(payload, passphrase);
          }}
        >
          <input
            type="text"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Passphrase"
            autoComplete="off"
            autoFocus
            className="input flex-1"
            aria-label="Passphrase"
          />
          <button type="submit" disabled={passphrase.length === 0} className="cmd-primary shrink-0">
            Unlock
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-sm text-alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="border border-hairline p-10 text-center">
        <h1 className="text-xl font-semibold">Something is wrong with this link</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-body">
          {error ?? 'We could not open this drop.'}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-hairline p-8 text-center">
      <div className="stamp mx-auto">End-to-end encrypted</div>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Someone sent you a drop</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-body">
        {meta?.burnAfterRead
          ? 'This one is destroyed the moment you open it. Make sure you have a minute.'
          : 'It stays readable until it expires.'}
        {meta && ` Expires in ${timeUntil(meta.expiresAt)}.`}
      </p>

      {!linkKey && (
        <p className="mx-auto mt-5 max-w-md border border-alert/50 p-3 text-sm text-alert">
          This link is missing the part after the <code>#</code>, which is the key. Ask the sender
          to resend it - some apps cut links short.
        </p>
      )}

      <button
        type="button"
        onClick={open}
        disabled={stage === 'opening' || !linkKey}
        className="cmd-primary mt-6"
      >
        {stage === 'opening' ? 'Decrypting…' : meta?.burnAfterRead ? 'Open once' : 'Open'}
      </button>
    </div>
  );
}
