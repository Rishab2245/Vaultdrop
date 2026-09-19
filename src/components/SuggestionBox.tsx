'use client';

import { useCallback, useState } from 'react';
import { SUGGESTION_KINDS, SUGGESTION_MAX } from '@/lib/constants';
import { getGhost, ghostHeaders } from '@/lib/ghost';

export function SuggestionBox() {
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<string>(SUGGESTION_KINDS[0].id);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redactions, setRedactions] = useState(0);

  const send = useCallback(async () => {
    if (body.trim().length < 8) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...ghostHeaders(getGhost()) },
        body: JSON.stringify({ body, kind }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not send that.');
        return;
      }

      setRedactions(data.redactions ?? 0);
      setSent(true);
      setBody('');
    } catch {
      setError('No response from the system.');
    } finally {
      setSending(false);
    }
  }, [body, kind]);

  if (sent) {
    return (
      <div className="border border-sealed/40 p-4">
        <span className="stamp">Received</span>
        <p className="mt-3 text-sm leading-relaxed text-body">
          Thank you. Nothing was attached to it that could identify you.
          {redactions > 0 &&
            ` ${redactions} contact ${redactions === 1 ? 'detail was' : 'details were'} stripped before it was stored.`}
        </p>
        <button type="button" onClick={() => setSent(false)} className="cmd mt-3">
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="border border-hairline">
      <div className="border-b border-hairline bg-panel px-2 py-1">
        <span className="field">What would make this better?</span>
      </div>

      <div className="p-3">
        <div className="mb-3 flex flex-wrap gap-1">
          {SUGGESTION_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              aria-pressed={kind === k.id}
              className="tag"
            >
              {k.label}
            </button>
          ))}
        </div>

        <label htmlFor="suggestion" className="sr-only">
          Your suggestion
        </label>
        <textarea
          id="suggestion"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={SUGGESTION_MAX + 100}
          placeholder="What is missing, what is broken, or what made you hesitate."
          className="input-human min-h-[120px] resize-none"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={send}
            disabled={sending || body.trim().length < 8 || body.length > SUGGESTION_MAX}
            className="cmd cmd-primary"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
          <span className={`field tabular ${body.length > SUGGESTION_MAX ? 'text-alert' : ''}`}>
            {SUGGESTION_MAX - body.length}
          </span>
          <span className="text-2xs uppercase tracking-[0.1em] text-label">
            No email asked for · none wanted
          </span>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm text-alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
