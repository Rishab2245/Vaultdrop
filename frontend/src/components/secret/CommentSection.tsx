'use client';

import { useState } from 'react';
import { Comment } from '@/types';
import { fetchGraphQL } from '@/lib/api';
import { ADD_COMMENT } from '@/lib/mutations';
import { useSessionStore } from '@/lib/hooks/useSession';
import { formatTimeAgo } from '@/lib/utils/formatters';

interface CommentSectionProps {
  secretId: string;
  initialComments: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  secretId: string;
  sessionId?: string;
  onReplyPosted: (parentId: string, reply: Comment) => void;
  depth?: number;
}

function CommentItem({ comment, secretId, sessionId, onReplyPosted, depth = 0 }: CommentItemProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');

  const handleReply = async () => {
    if (!replyText.trim() || replyText.length < 3) {
      setError('TOO SHORT');
      return;
    }
    if (replyText.length > 500) {
      setError('TOO LONG (MAX 500)');
      return;
    }
    setError('');
    setIsPosting(true);
    try {
      const data = await fetchGraphQL<{ addComment: Comment }>(
        ADD_COMMENT,
        { secretId, content: replyText.trim(), parentId: comment.id },
        sessionId
      );
      onReplyPosted(comment.id, data.addComment);
      setReplyText('');
      setShowReplyBox(false);
    } catch {
      setError('FAILED TO POST. TRY AGAIN.');
    } finally {
      setIsPosting(false);
    }
  };

  const borderColor = depth === 0 ? '#2a3555' : '#1a2540';
  const leftBorder = depth > 0 ? '3px solid #00ffff33' : 'none';

  return (
    <div
      style={{
        background: depth === 0 ? '#0d1525' : '#0a1020',
        padding: '14px',
        boxShadow: `0 -2px 0 0 ${borderColor}, 0 2px 0 0 ${borderColor}, -2px 0 0 0 ${borderColor}, 2px 0 0 0 ${borderColor}`,
        borderLeft: leftBorder,
        marginLeft: depth > 0 ? '0' : '0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            color: depth === 0 ? '#00ffff' : '#44ff44',
            textShadow: depth === 0 ? '0 0 6px #00ffff44' : '0 0 6px #44ff4444',
          }}
        >
          {depth > 0 ? '↩ ' : ''}{comment.codename}
        </span>
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '7px',
            color: '#8899aa',
          }}
        >
          {formatTimeAgo(comment.createdAt)}
        </span>
      </div>
      <p
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '9px',
          color: '#e8e8e8',
          lineHeight: '2',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          marginBottom: '10px',
        }}
      >
        {comment.content}
      </p>

      {/* Reply button — only on top-level comments */}
      {depth === 0 && (
        <button
          onClick={() => setShowReplyBox((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '7px',
            color: showReplyBox ? '#00ffff' : '#8899aa',
            padding: '4px 8px',
            boxShadow: showReplyBox
              ? '0 -1px 0 0 #00ffff, 0 1px 0 0 #00ffff, -1px 0 0 0 #00ffff, 1px 0 0 0 #00ffff'
              : 'none',
          }}
        >
          ↩ REPLY {comment.replies && comment.replies.length > 0 ? `(${comment.replies.length})` : ''}
        </button>
      )}

      {/* Reply input box */}
      {showReplyBox && (
        <div style={{ marginTop: '12px' }}>
          <textarea
            className="pixel-input"
            value={replyText}
            onChange={(e) => {
              setReplyText(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply();
            }}
            placeholder="REPLY... (CTRL+ENTER TO POST)"
            rows={2}
            maxLength={500}
            disabled={isPosting}
            style={{ fontSize: '9px' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '6px',
            }}
          >
            {error ? (
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#ff4444' }}>
                ⚠ {error}
              </span>
            ) : (
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa' }}>
                {replyText.length}/500
              </span>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setShowReplyBox(false); setReplyText(''); setError(''); }}
                className="pixel-btn pixel-btn-sm"
                style={{ fontSize: '7px' }}
              >
                CANCEL
              </button>
              <button
                onClick={handleReply}
                disabled={isPosting || !replyText.trim()}
                className="pixel-btn pixel-btn-cyan pixel-btn-sm"
              >
                {isPosting ? '...' : '↩ POST REPLY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', marginLeft: '16px' }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              secretId={secretId}
              sessionId={sessionId}
              onReplyPosted={onReplyPosted}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ secretId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(
    (initialComments ?? []).map((c) => ({ ...c, replies: c.replies ?? [] }))
  );
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');
  const { session } = useSessionStore();

  const handlePost = async () => {
    if (!newComment.trim() || newComment.length < 3) {
      setError('TOO SHORT');
      return;
    }
    if (newComment.length > 500) {
      setError('TOO LONG (MAX 500)');
      return;
    }
    setError('');
    setIsPosting(true);

    try {
      const data = await fetchGraphQL<{ addComment: Comment }>(
        ADD_COMMENT,
        { secretId, content: newComment.trim() },
        session?.id
      );
      setComments((prev) => [{ ...data.addComment, replies: data.addComment.replies ?? [] }, ...prev]);
      setNewComment('');
    } catch {
      setError('FAILED TO POST. TRY AGAIN.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleReplyPosted = (parentId: string, reply: Comment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies ?? []), reply] }
          : c
      )
    );
  };

  return (
    <div id="comments">
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '11px',
          color: '#ffd700',
          textShadow: '0 0 8px #ffd700',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        💬 COMMENTS ({comments.length})
      </div>

      {/* Comment input */}
      <div style={{ marginBottom: '24px' }}>
        <textarea
          className="pixel-input"
          value={newComment}
          onChange={(e) => {
            setNewComment(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost();
          }}
          placeholder="SAY SOMETHING... (CTRL+ENTER TO POST)"
          rows={3}
          maxLength={500}
          disabled={isPosting}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          {error ? (
            <span
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#ff4444',
              }}
            >
              ⚠ {error}
            </span>
          ) : (
            <span
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: '#8899aa',
              }}
            >
              {session ? `POSTING AS ${session.codename}` : 'ANONYMOUS'}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: newComment.length > 450 ? '#ff4444' : '#8899aa',
              }}
            >
              {newComment.length}/500
            </span>
            <button
              onClick={handlePost}
              disabled={isPosting || !newComment.trim()}
              className="pixel-btn pixel-btn-gold pixel-btn-sm"
            >
              {isPosting ? '...' : '💬 POST'}
            </button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {comments.length === 0 ? (
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '9px',
              color: '#8899aa',
              textAlign: 'center',
              padding: '32px',
              boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 2px 0 #2a3555',
            }}
          >
            👻 NO COMMENTS YET.
            <br />
            <br />
            BE THE FIRST.
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              secretId={secretId}
              sessionId={session?.id}
              onReplyPosted={handleReplyPosted}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  );
}
