'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { sealToInbox } from '@/lib/crypto';
import { useGhost } from '@/lib/use-ghost';

type Phase = 'idle' | 'composing' | 'sending' | 'sent' | 'unreachable' | 'error';

/**
 * Reach the author of a record you recognised yourself in.
 *
 * The reason people confess is rarely the audience. It is the hope that
 * somebody else has been here too, and this is the only feature in the product
 * that pays that off directly - no Keys involved.
 *
 * The message is sealed to the author's ECDH key before it leaves the browser,
 * so the server routes a conversation it cannot read between two people who
 * cannot identify each other.
 */
export function SameThread({ secretId }: { secretId: string }) {
  const { authedFetch } = useGhost();

  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<{ codename: string; publicKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const begin = useCallback(async () => {
    setError(null);
    setPhase('composing');

    try {
      const response = await authedFetch(`/api/wall/${secretId}/thread`);
      const data = await response.json();

      if (!data.reachable) {
        setPhase('unreachable');
        return;
      }
      if (data.existingThreadId) {
        setThreadId(data.existingThreadId);
        setPhase('sent');
        return;
      }
      setRecipient({ codename: data.codename, publicKey: data.publicKey });
    } catch {
      setError('Could not reach that author.');
      setPhase('error');
    }
  }, [authedFetch, secretId]);

  const send = useCallback(async () => {
    if (!recipient || note.trim().length < 2) return;
    setPhase('sending');

    try {
      const sealed = await sealToInbox(recipient.publicKey, note.trim());
      const response = await authedFetch(`/api/wall/${secretId}/thread`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sealed),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not send that.');
        setPhase('error');
        return;
      }

      setThreadId(data.threadId);
      setPhase('sent');
    } catch (err) {
      // Distinguish the two real causes. Reporting "needs a secure connection"
      // for an unusable recipient key sent people to debug their browser over
      // a problem in our data.
      const insecure =
        typeof window !== 'undefined' && !window.isSecureContext;
      setError(
        insecure
          ? 'Encryption needs a secure connection. Open this page over HTTPS.'
          : "This ghost's key cannot be used, so there is no way to reach them."
      );
      console.error('[SameThread] seal failed', err);
      setPhase('error');
    }
  }, [authedFetch, note, recipient, secretId]);

  if (phase === 'idle') {
    return (
      <button type="button" onClick={begin} className="cmd-bare" title="Tell them you have been here too">
        REACH OUT
      </button>
    );
  }

  if (phase === 'unreachable') {
    return <span className="text-2xs uppercase tracking-[0.1em] text-label">FILED ANONYMOUSLY</span>;
  }

  if (phase === 'sent') {
    return (
      <Link href={threadId ? `/threads/${threadId}` : '/threads'} className="cmd-bare text-sealed">
        THREAD OPEN →
      </Link>
    );
  }

  return (
    <div className="w-full border-t border-hairline bg-panel px-3 py-2.5">
      <p className="field mb-2">
        {recipient ? `Sealed to ${recipient.codename}` : 'Preparing…'}
      </p>

      <label htmlFor={`same-${secretId}`} className="sr-only">
        What you want to say
      </label>
      <textarea
        id={`same-${secretId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="I have been exactly here. You are not the only one."
        className="input-human min-h-[80px] resize-none"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={phase === 'sending' || !recipient || note.trim().length < 2}
          className="cmd cmd-primary"
        >
          {phase === 'sending' ? 'Sealing…' : 'Send privately'}
        </button>
        <button type="button" onClick={() => setPhase('idle')} className="cmd">
          Cancel
        </button>
        <span className="text-2xs uppercase tracking-[0.1em] text-label">
          Encrypted here · we cannot read it
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
