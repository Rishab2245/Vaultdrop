'use client';

import { useCallback, useState } from 'react';
import { EXPIRY_OPTIONS, LIMITS } from '@/lib/constants';
import { sealLinkDrop } from '@/lib/crypto';
import { rememberDrop } from '@/lib/local-vault';
import { CopyField } from './CopyField';

export function DropComposer() {
  const [body, setBody] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [burn, setBurn] = useState(true);
  const [expiry, setExpiry] = useState<string>('24h');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const canSubmit = body.trim().length > 0 && !working && (!usePassphrase || passphrase.length >= 4);

  const create = useCallback(async () => {
    if (!canSubmit) return;
    setWorking(true);
    setError(null);

    try {
      // Encryption happens before anything touches the network. By the time the
      // request leaves, the plaintext is gone and the key is ours alone.
      const { payload, linkKey } = await sealLinkDrop(
        body,
        usePassphrase ? passphrase : undefined
      );

      const response = await fetch('/api/drops', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, burnAfterRead: burn, expiry }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Could not store the drop.');
        return;
      }

      const url = `${window.location.origin}/d/${data.id}#${linkKey}`;
      setLink(url);
      rememberDrop({
        id: data.id,
        url,
        createdAt: new Date().toISOString(),
        expiresAt: data.expiresAt,
        burnAfterRead: data.burnAfterRead,
        note: body.slice(0, 60),
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('secure context')
          ? 'Encryption needs HTTPS. Open this page over a secure connection.'
          : 'Could not create the drop.'
      );
    } finally {
      setWorking(false);
    }
  }, [body, burn, canSubmit, expiry, passphrase, usePassphrase]);

  const reset = useCallback(() => {
    setLink(null);
    setBody('');
    setPassphrase('');
    setUsePassphrase(false);
  }, []);

  if (link) {
    return (
      <div className="space-y-5">
        <div className="panel p-6">
          <div className="sealed mb-4">Sealed</div>
          <h2 className="text-xl font-semibold">Your link is ready</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-chalk-dim">
            Everything after the <code className="text-chalk">#</code> is the decryption key. Send
            this link over something you trust - anyone who gets it can read the drop
            {usePassphrase ? ', if they also know the passphrase' : ''}.
          </p>

          <CopyField value={link} className="mt-5" />

          <ul className="mt-5 space-y-1.5 text-sm text-chalk-faint">
            <li>· {burn ? 'Destroyed the moment it is opened.' : 'Can be opened more than once.'}</li>
            <li>· Expires in {EXPIRY_OPTIONS.find((o) => o.id === expiry)?.label ?? '24 hours'}.</li>
            {usePassphrase && <li>· The passphrase is required. We do not have it.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-ember/30 bg-ember/5 p-4 text-sm text-chalk-dim">
          <strong className="text-chalk">Save it now.</strong> We cannot show you this link again -
          the key was never sent to us, so there is nothing to look up.
        </div>

        <button type="button" onClick={reset} className="btn-ghost">
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5 sm:p-6">
        <label htmlFor="drop-body" className="label">
          What are you sending?
        </label>
        <textarea
          id="drop-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A password, an address, a confession meant for exactly one person."
          rows={7}
          maxLength={LIMITS.dropBodyMax}
          className="field mt-2 min-h-[180px] resize-none font-mono text-sm leading-relaxed"
        />
        <p className="mt-2 text-xs text-chalk-faint">
          {body.length.toLocaleString()} / {LIMITS.dropBodyMax.toLocaleString()} characters
        </p>
      </div>

      <div className="panel space-y-5 p-5 sm:p-6">
        <div>
          <p className="label">Expires after</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setExpiry(option.id)}
                aria-pressed={expiry === option.id}
                className={`chip ${expiry === option.id ? 'chip-active' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={burn}
            onChange={(e) => setBurn(e.target.checked)}
            className="mt-1 h-4 w-4 accent-violet"
          />
          <span>
            <span className="text-sm font-medium">Destroy after reading</span>
            <span className="block text-xs text-chalk-faint">
              The first person to open it is the only one who ever can.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={usePassphrase}
            onChange={(e) => setUsePassphrase(e.target.checked)}
            className="mt-1 h-4 w-4 accent-violet"
          />
          <span>
            <span className="text-sm font-medium">Also require a passphrase</span>
            <span className="block text-xs text-chalk-faint">
              So a forwarded link on its own is not enough to open it.
            </span>
          </span>
        </label>

        {usePassphrase && (
          <div>
            <label htmlFor="passphrase" className="label">
              Passphrase
            </label>
            <input
              id="passphrase"
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Share this separately - by voice, ideally"
              className="field mt-2"
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-chalk-faint">
              At least 4 characters. If you forget it, the drop is unreadable forever.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-ember/40 bg-ember/10 p-4 text-sm text-ember">
          {error}
        </p>
      )}

      <button type="button" onClick={create} disabled={!canSubmit} className="btn-primary">
        {working ? 'Encrypting…' : 'Encrypt and get a link'}
      </button>
    </div>
  );
}
