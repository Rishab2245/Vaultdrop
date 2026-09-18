'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openInboxMessage, sealToInbox } from '@/lib/crypto';
import { timeAgo } from '@/lib/format';
import { getGhost, ghostHeaders } from '@/lib/ghost';

interface RawMessage {
  id: string;
  mine: boolean;
  ciphertext: string;
  iv: string;
  senderPubKey: string;
  createdAt: string;
}

interface ReadMessage extends RawMessage {
  text: string | null;
}

/**
 * One private thread.
 *
 * Everything arrives as ciphertext and is opened here, against a private key
 * that has never left this device. A message the server could render is a
 * message the server could read.
 */
export function ThreadView({ threadId }: { threadId: string }) {
  const [messages, setMessages] = useState<ReadMessage[]>([]);
  const [other, setOther] = useState<{ codename: string; publicKey: string } | null>(null);
  const [preview, setPreview] = useState('');
  const [closed, setClosed] = useState(false);
  const [role, setRole] = useState<'author' | 'starter'>('starter');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const identity = getGhost();
    if (!identity) {
      setError('This browser has no ghost, so it cannot open this thread.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/threads/${threadId}/messages`, {
        headers: ghostHeaders(identity),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? 'Could not load that thread.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setOther(data.other);
      setPreview(data.secret.preview);
      setClosed(data.thread.closed);
      setRole(data.thread.role);

      // Decrypt every message locally. One that fails to open stays in the list
      // as an explicit gap rather than vanishing - silently dropping a message
      // would be worse than showing that something is there.
      const opened = await Promise.all(
        (data.messages as RawMessage[]).map(async (message) => {
          try {
            const text = await openInboxMessage(identity.privateKey, identity.publicKey, {
              ciphertext: message.ciphertext,
              iv: message.iv,
              senderPubKey: message.senderPubKey,
            });
            return { ...message, text };
          } catch {
            return { ...message, text: null };
          }
        })
      );

      setMessages(opened);
    } catch {
      setError('Could not load that thread.');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const send = useCallback(async () => {
    const identity = getGhost();
    if (!identity || !other || draft.trim().length < 1) return;

    setSending(true);
    setError(null);

    try {
      const sealed = await sealToInbox(other.publicKey, draft.trim());
      const response = await fetch(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...ghostHeaders(identity) },
        body: JSON.stringify(sealed),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? 'Could not send that.');
        return;
      }

      setDraft('');
      await load();
    } catch {
      setError('Encryption failed. This needs a secure connection.');
    } finally {
      setSending(false);
    }
  }, [draft, load, other, threadId]);

  const close = useCallback(async () => {
    const identity = getGhost();
    if (!identity) return;
    await fetch(`/api/threads/${threadId}/messages`, {
      method: 'DELETE',
      headers: ghostHeaders(identity),
    });
    setClosed(true);
  }, [threadId]);

  if (loading) return <div className="skeleton h-64" aria-label="Loading" />;

  if (error && messages.length === 0) {
    return (
      <div className="border border-alert/50 p-6 text-center">
        <p className="text-sm text-alert">{error}</p>
        <Link href="/threads" className="cmd mt-4 no-underline">
          Back to threads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rec">
        <div className="rec-head">
          <span>THREAD</span>
          <span>{other?.codename ?? 'UNKNOWN'}</span>
          <span className="ml-auto">{role === 'author' ? 'THEY REACHED YOU' : 'YOU REACHED THEM'}</span>
        </div>
        <div className="rec-body">
          <p className="field mb-1.5">The record this came from</p>
          <p className="prose-human text-base">{preview}</p>
        </div>
      </div>

      <div className="space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`border px-3 py-2.5 ${
              message.mine ? 'border-hairline' : 'border-amber/40'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="field">{message.mine ? 'You' : (other?.codename ?? 'Them')}</span>
              <span className="field">{timeAgo(message.createdAt)}</span>
            </div>
            {message.text === null ? (
              <p className="text-sm text-alert">
                This message will not open with this device&apos;s key.
              </p>
            ) : (
              <p className="prose-human">{message.text}</p>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {closed ? (
        <p className="notice-alert">This thread is closed. Neither side can add to it.</p>
      ) : (
        <div className="border border-hairline p-3">
          <label htmlFor="reply" className="sr-only">
            Your reply
          </label>
          <textarea
            id="reply"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Say it plainly. Nobody here knows who you are, including them."
            className="input-human min-h-[80px] resize-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={send}
              disabled={sending || draft.trim().length < 1}
              className="cmd cmd-primary"
            >
              {sending ? 'Sealing…' : 'Send'}
            </button>
            <button type="button" onClick={close} className="cmd cmd-danger">
              Close thread
            </button>
            <span className="text-2xs uppercase tracking-[0.1em] text-label">
              Encrypted on this device
            </span>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
