'use client';

import { useCallback, useEffect, useState } from 'react';
import { timeAgo } from '@/lib/format';
import { getGhost, ghostHeaders } from '@/lib/ghost';
import { useGhost } from '@/lib/use-ghost';

interface CommentRow {
  id: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  author: { codename: string; standing: string };
  mine: boolean;
  byRecordAuthor: boolean;
}

const MAX = 500;

/**
 * Replies on a record.
 *
 * Nested one level deep and no further. A confession is not a forum thread, and
 * every extra level of nesting pulls it further towards being an argument
 * somebody else is having underneath something painful you wrote.
 */
export function CommentThread({
  secretId,
  locked: initialLocked,
  initialCount,
}: {
  secretId: string;
  locked: boolean;
  initialCount: number;
}) {
  const { authedFetch } = useGhost();

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [locked, setLocked] = useState(initialLocked);
  const [isRecordAuthor, setIsRecordAuthor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redactions, setRedactions] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/wall/${secretId}/comments`, {
        headers: ghostHeaders(getGhost()),
      });
      if (!response.ok) return;
      const data = await response.json();
      setComments(data.comments);
      setLocked(data.locked);
      setIsRecordAuthor(data.isRecordAuthor);
    } catch {
      /* the section simply stays empty */
    } finally {
      setLoading(false);
    }
  }, [secretId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(async () => {
    if (draft.trim().length < 2) return;
    setSending(true);
    setError(null);
    setRedactions(0);

    try {
      const response = await authedFetch(`/api/wall/${secretId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: draft, parentId: replyTo?.id ?? null }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not post that.');
        return;
      }

      setDraft('');
      setReplyTo(null);
      setRedactions(data.redactions ?? 0);
      await load();
    } catch {
      setError('No response from the system.');
    } finally {
      setSending(false);
    }
  }, [authedFetch, draft, load, replyTo, secretId]);

  const remove = useCallback(
    async (comment: CommentRow) => {
      setComments((prev) => prev.filter((c) => c.id !== comment.id && c.parentId !== comment.id));
      try {
        await authedFetch(`/api/comments/${comment.id}`, { method: 'DELETE' });
      } catch {
        /* removed locally; a reload reconciles */
      }
    },
    [authedFetch]
  );

  const report = useCallback(
    async (comment: CommentRow) => {
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      try {
        await fetch(`/api/comments/${comment.id}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...ghostHeaders(getGhost()) },
          body: JSON.stringify({ action: 'report' }),
        });
      } catch {
        /* the acknowledgement is for the reporter */
      }
    },
    []
  );

  const roots = comments.filter((c) => !c.parentId);
  const childrenOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <section className="mt-4 border border-hairline">
      <div className="flex items-center justify-between border-b border-hairline bg-panel px-2 py-1">
        <span className="field">
          Replies {comments.length > 0 ? `· ${comments.length}` : initialCount ? `· ${initialCount}` : ''}
        </span>
        {locked && <span className="field text-alert">Closed</span>}
      </div>

      {loading ? (
        <div className="skeleton m-2 h-16" aria-label="Loading replies" />
      ) : (
        <>
          {roots.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-label">
              {locked
                ? 'The author closed this record to replies.'
                : 'No replies yet. If you have been here too, say so.'}
            </p>
          )}

          <ul className="divide-y divide-hairline">
            {roots.map((comment) => (
              <li key={comment.id}>
                <CommentRowView
                  comment={comment}
                  onReply={locked ? undefined : () => setReplyTo(comment)}
                  onRemove={comment.mine || isRecordAuthor ? () => remove(comment) : undefined}
                  onReport={() => report(comment)}
                />
                {childrenOf(comment.id).map((child) => (
                  <div key={child.id} className="border-l border-hairline pl-3">
                    <CommentRowView
                      comment={child}
                      onReply={locked ? undefined : () => setReplyTo(comment)}
                      onRemove={child.mine || isRecordAuthor ? () => remove(child) : undefined}
                      onReport={() => report(child)}
                    />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}

      {!locked && (
        <div className="border-t border-hairline p-3">
          {replyTo && (
            <p className="field mb-1.5">
              Replying to {replyTo.author.codename}{' '}
              <button type="button" onClick={() => setReplyTo(null)} className="text-amber">
                (cancel)
              </button>
            </p>
          )}

          <label htmlFor={`reply-${secretId}`} className="sr-only">
            Your reply
          </label>
          <textarea
            id={`reply-${secretId}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={MAX + 100}
            placeholder="Say something you would still stand behind if they could see who you were."
            className="input-human min-h-[72px] resize-none"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={send}
              disabled={sending || draft.trim().length < 2 || draft.length > MAX}
              className="cmd cmd-primary"
            >
              {sending ? 'Posting…' : 'Reply'}
            </button>
            <span className={`field tabular ${draft.length > MAX ? 'text-alert' : ''}`}>
              {MAX - draft.length}
            </span>
            <span className="text-2xs uppercase tracking-[0.1em] text-label">
              Public · carries your standing
            </span>
          </div>

          {redactions > 0 && (
            <p className="notice-sealed mt-2">
              {redactions} {redactions === 1 ? 'detail was' : 'details were'} redacted before
              posting.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-alert">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function CommentRowView({
  comment,
  onReply,
  onRemove,
  onReport,
}: {
  comment: CommentRow;
  onReply?: () => void;
  onRemove?: () => void;
  onReport: () => void;
}) {
  return (
    <article className="px-3 py-2.5">
      <div className="mb-1 flex flex-wrap items-center gap-x-3 text-2xs uppercase tracking-[0.1em] text-label">
        <span className={comment.byRecordAuthor ? 'text-amber' : ''}>
          {comment.author.codename}
          {comment.byRecordAuthor && ' · author'}
        </span>
        <span
          className={
            comment.author.standing === 'TRUSTED'
              ? 'text-sealed'
              : comment.author.standing === 'POOR'
                ? 'text-alert'
                : ''
          }
        >
          {comment.author.standing}
        </span>
        <span className="ml-auto" suppressHydrationWarning>
          {timeAgo(comment.createdAt)}
        </span>
      </div>

      <p className="prose-human text-base">{comment.body}</p>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {onReply && (
          <button type="button" onClick={onReply} className="cmd-bare">
            Reply
          </button>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} className="cmd-bare text-alert">
            Remove
          </button>
        )}
        {!comment.mine && (
          <button type="button" onClick={onReport} className="cmd-bare">
            Flag
          </button>
        )}
      </div>
    </article>
  );
}
