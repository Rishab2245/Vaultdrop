'use client';

import { useCallback, useEffect, useState } from 'react';
import { LIMITS, normaliseHandle } from '@/lib/constants';
import {
  generateCapabilityToken,
  generateInboxKeypair,
  hashCapabilityToken,
  openInboxMessage,
} from '@/lib/crypto';
import { clearInbox, getInbox, saveInbox, type StoredInbox } from '@/lib/local-vault';
import { timeAgo } from '@/lib/format';
import { CopyField } from './CopyField';

interface DecryptedMessage {
  id: string;
  text: string | null;
  createdAt: string;
}

export function InboxManager() {
  const [inbox, setInbox] = useState<StoredInbox | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [handle, setHandle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    setInbox(getInbox());
    setHydrated(true);
  }, []);

  const loadMessages = useCallback(async (current: StoredInbox) => {
    setLoadingMessages(true);
    try {
      const tokenHash = await hashCapabilityToken(current.ownerToken);
      const response = await fetch(`/api/inboxes/${current.handle}/messages`, {
        headers: { 'x-owner-token-hash': tokenHash },
      });
      if (!response.ok) {
        setError('Could not load your messages.');
        return;
      }

      const data = await response.json();
      const decrypted = await Promise.all(
        (data.messages as Array<Record<string, string>>).map(async (m) => {
          try {
            return {
              id: m.id,
              text: await openInboxMessage(current.privateKey, current.publicKey, {
                ciphertext: m.ciphertext,
                iv: m.iv,
                senderPubKey: m.senderPubKey,
              }),
              createdAt: m.createdAt,
            };
          } catch {
            // A message we cannot decrypt is shown as such rather than hidden -
            // silently dropping it would look like censorship.
            return { id: m.id, text: null, createdAt: m.createdAt };
          }
        })
      );
      setMessages(decrypted);
      setError(null);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (inbox) void loadMessages(inbox);
  }, [inbox, loadMessages]);

  const create = useCallback(async () => {
    const wanted = normaliseHandle(handle);
    if (wanted.length < LIMITS.handleMin) {
      setError(`Pick something at least ${LIMITS.handleMin} characters.`);
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Both halves are made here. Only the public half is ever uploaded.
      const keypair = await generateInboxKeypair();
      const ownerToken = generateCapabilityToken();
      const ownerTokenHash = await hashCapabilityToken(ownerToken);

      const response = await fetch('/api/inboxes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle: wanted, publicKey: keypair.publicKey, ownerTokenHash }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Could not create that inbox.');
        return;
      }

      const stored: StoredInbox = {
        handle: data.handle,
        publicKey: keypair.publicKey,
        privateKey: keypair.privateKey,
        ownerToken,
        createdAt: data.createdAt,
      };
      saveInbox(stored);
      setInbox(stored);
      setShowRecovery(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('secure context')
          ? 'Key generation needs HTTPS. Open this page over a secure connection.'
          : 'Could not create that inbox.'
      );
    } finally {
      setCreating(false);
    }
  }, [handle]);

  const removeMessage = useCallback(
    async (messageId: string) => {
      if (!inbox) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      try {
        const tokenHash = await hashCapabilityToken(inbox.ownerToken);
        await fetch(`/api/inboxes/${inbox.handle}/messages/${messageId}`, {
          method: 'DELETE',
          headers: { 'x-owner-token-hash': tokenHash },
        });
      } catch {
        /* it is already gone from view; a retry on reload is fine */
      }
    },
    [inbox]
  );

  const forget = useCallback(() => {
    clearInbox();
    setInbox(null);
    setMessages([]);
    setHandle('');
  }, []);

  if (!hydrated) return <div className="skeleton h-72" aria-label="Loading" />;

  if (!inbox) {
    return (
      <div className="space-y-6">
        <header>
          <div className="sealed mb-4">Only you can read these</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get your link</h1>
          <p className="mt-2 text-pretty leading-relaxed text-chalk-dim">
            Put it in your bio or a story. People say what they actually think, encrypted to a key
            that exists only in this browser.
          </p>
        </header>

        <div className="panel p-5 sm:p-6">
          <label htmlFor="handle" className="label">
            Choose a handle
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 font-mono text-sm text-chalk-faint">/to/</span>
            <input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(normaliseHandle(e.target.value))}
              placeholder="nightowl"
              maxLength={LIMITS.handleMax}
              className="field font-mono"
              autoComplete="off"
            />
          </div>
          <p className="mt-2 text-xs text-chalk-faint">
            Lowercase letters, numbers, dashes. Pick something that is not your real name.
          </p>

          {error && (
            <p role="alert" className="mt-4 text-sm text-ember">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={create}
            disabled={creating || handle.length < LIMITS.handleMin}
            className="btn-primary mt-5"
          >
            {creating ? 'Generating keys…' : 'Create my inbox'}
          </button>
        </div>

        <p className="text-xs leading-relaxed text-chalk-faint">
          Your private key is generated on this device and never uploaded. That is what makes the
          messages unreadable to us - and it means clearing your browser data destroys them, unless
          you keep the recovery key we show you next.
        </p>
      </div>
    );
  }

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/to/${inbox.handle}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="sealed mb-3">End-to-end encrypted</div>
          <h1 className="text-3xl font-semibold tracking-tight">/to/{inbox.handle}</h1>
          <p className="mt-1 text-sm text-chalk-dim">
            {messages.length === 0
              ? 'No messages yet.'
              : `${messages.length} message${messages.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <button type="button" onClick={() => void loadMessages(inbox)} className="btn-ghost text-xs">
          {loadingMessages ? 'Checking…' : 'Refresh'}
        </button>
      </header>

      <div className="panel p-5">
        <p className="label mb-3">Your link</p>
        <CopyField value={shareUrl} />
        <p className="mt-3 text-xs text-chalk-faint">
          Paste it into an Instagram story, a bio, a group chat. Anyone with it can write to you.
        </p>
      </div>

      {showRecovery && (
        <div className="rounded-2xl border border-ember/40 bg-ember/5 p-5">
          <p className="font-medium text-chalk">Save your recovery key</p>
          <p className="mt-1 text-sm leading-relaxed text-chalk-dim">
            This is the only way back into this inbox if you clear your browser or switch devices.
            We do not have a copy, so we cannot resend it.
          </p>
          <textarea
            readOnly
            value={inbox.privateKey}
            onFocus={(e) => e.currentTarget.select()}
            rows={3}
            className="field mt-4 resize-none break-all font-mono text-[11px]"
            aria-label="Recovery key"
          />
          <button
            type="button"
            onClick={() => setShowRecovery(false)}
            className="btn-ghost mt-3 text-xs"
          >
            I have saved it
          </button>
        </div>
      )}

      <div className="space-y-3">
        {messages.length === 0 && !loadingMessages && (
          <div className="panel p-10 text-center">
            <p className="text-chalk-dim">Nothing yet.</p>
            <p className="mt-1 text-sm text-chalk-faint">
              Share your link and check back. Messages land here encrypted.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <article key={message.id} className="panel animate-fade-up p-5">
            {message.text === null ? (
              <p className="text-sm italic text-chalk-faint">
                This message could not be decrypted with your current key.
              </p>
            ) : (
              <p className="whitespace-pre-wrap text-pretty leading-relaxed text-chalk">
                {message.text}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-chalk-faint">
              <time dateTime={message.createdAt}>{timeAgo(message.createdAt)}</time>
              <button
                type="button"
                onClick={() => void removeMessage(message.id)}
                className="btn-quiet"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {error && <p className="text-sm text-ember">{error}</p>}

      <details className="panel p-5">
        <summary className="cursor-pointer text-sm text-chalk-dim">Danger zone</summary>
        <p className="mt-3 text-sm leading-relaxed text-chalk-faint">
          Forgetting this inbox removes the keys from this browser. Without your recovery key the
          messages become permanently unreadable - by you and by everyone.
        </p>
        <button type="button" onClick={forget} className="btn-ghost mt-4 text-xs text-ember">
          Forget this inbox
        </button>
      </details>
    </div>
  );
}
