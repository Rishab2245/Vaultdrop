'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { LIMITS } from '@/lib/constants';
import { sealToInbox } from '@/lib/crypto';

export function InboxSender({ handle, publicKey }: { handle: string; publicKey: string }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = LIMITS.inboxMessageMax - body.length;
  const canSend = body.trim().length > 0 && remaining >= 0 && !sending;

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);

    try {
      // Encrypted to their public key, with a throwaway key of our own. Nothing
      // here ties the message to this browser, this session, or each other.
      const sealed = await sealToInbox(publicKey, body);

      const response = await fetch(`/api/inboxes/${handle}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sealed),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? 'Could not send that.');
        return;
      }

      setSent(true);
      setBody('');
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('secure context')
          ? 'Encryption needs HTTPS. Open this page over a secure connection.'
          : 'Could not send that.'
      );
    } finally {
      setSending(false);
    }
  }, [body, canSend, handle, publicKey]);

  if (sent) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-3xl" aria-hidden="true">
          ✦
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Sent</h1>
        <p className="mx-auto mt-2 max-w-sm text-pretty text-sm leading-relaxed text-chalk-dim">
          They will read it and never know it was you. We did not record who you are either - there
          was nothing to record.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setSent(false)} className="btn-ghost">
            Send another
          </button>
          <Link href="/inbox" className="btn-primary">
            Get a link of your own
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="text-center">
        <div className="sealed mx-auto mb-5">End-to-end encrypted</div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Tell <span className="text-violet-soft">/{handle}</span> what you really think
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty leading-relaxed text-chalk-dim">
          They will never know it was you. No account, no sign-up, and nothing for us to read -
          this is encrypted in your browser to a key only they hold.
        </p>
      </header>

      <div className="panel p-5 sm:p-6">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say the thing you would never say to their face."
          rows={6}
          maxLength={LIMITS.inboxMessageMax + 100}
          autoFocus
          className="field min-h-[160px] resize-none text-[17px] leading-relaxed"
          aria-label="Your anonymous message"
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-chalk-faint">Be honest. Do not be cruel.</span>
          <span className={remaining < 0 ? 'text-ember' : 'text-chalk-faint'}>{remaining}</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-ember/40 bg-ember/10 p-4 text-sm text-ember">
          {error}
        </p>
      )}

      <button type="button" onClick={send} disabled={!canSend} className="btn-primary w-full">
        {sending ? 'Encrypting…' : 'Send anonymously'}
      </button>

      <p className="text-center text-xs text-chalk-faint">
        Harassment is still harassment when it is anonymous. Recipients can delete and report.
      </p>
    </div>
  );
}
