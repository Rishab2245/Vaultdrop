'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Secret, Comment } from '@/types';
import PixelBadge from '@/components/ui/PixelBadge';
import VoteButton from '@/components/feed/VoteButton';
import ReactionBar from '@/components/secret/ReactionBar';
import CommentSection from '@/components/secret/CommentSection';
import PeekModal from '@/components/secret/PeekModal';
import UnlockModal from '@/components/secret/UnlockModal';
import LoadingPixels from '@/components/ui/LoadingPixels';
import { fetchGraphQL } from '@/lib/api';
import { GET_SECRET_BY_ID, GET_COMMENTS } from '@/lib/queries';
import { formatTimeAgo, formatCurrency, getCategoryEmoji } from '@/lib/utils/formatters';


export default function SecretDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const action = searchParams.get('action');

  const [secret, setSecret] = useState<Secret | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPeek, setShowPeek] = useState(action === 'peek');
  const [showUnlock, setShowUnlock] = useState(action === 'unlock');
  const [revealedContent, setRevealedContent] = useState<string | null>(null);
  const [revealedHint, setRevealedHint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [secretData, commentsData] = await Promise.all([
          fetchGraphQL<{ secret: Secret }>(GET_SECRET_BY_ID, { id }),
          fetchGraphQL<{ comments: Comment[] }>(GET_COMMENTS, { secretId: id, limit: 20 }),
        ]);
        if (!secretData.secret) {
          setLoadError('Secret not found.');
        } else {
          setSecret(secretData.secret);
          setComments(commentsData.comments ?? []);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load secret. Make sure the backend is running.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <LoadingPixels label="LOADING SECRET..." />;
  if (loadError || !secret) return (
    <div style={{ textAlign: 'center', padding: '64px', fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#ff4444', lineHeight: 2 }}>
      💀 {loadError ?? 'SECRET NOT FOUND'}
      <br /><br />
      <Link href="/feed" className="pixel-btn pixel-btn-gold" style={{ textDecoration: 'none' }}>← BACK TO FEED</Link>
    </div>
  );

  const displayContent = revealedContent ?? (secret.isGhost && !secret.hasUnlocked ? null : secret.content);
  const displayHint = revealedHint ?? secret.hintText;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 16px' }}>
      {/* Breadcrumb */}
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '8px',
          color: '#8899aa',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Link href="/feed" style={{ color: '#ffd700', textDecoration: 'none' }}>FEED</Link>
        <span>›</span>
        <span>{getCategoryEmoji(secret.category)} {secret.category}</span>
        <span>›</span>
        <span style={{ color: '#8899aa' }}>SECRET #{id.slice(0, 8).toUpperCase()}</span>
      </div>

      {/* Main card */}
      <div
        style={{
          background: 'var(--bg-card)',
          boxShadow: secret.isGhost
            ? '0 -1px 0 0 #2d4a5a, 0 1px 0 0 #2d4a5a, -1px 0 0 0 #2d4a5a, 1px 0 0 0 #2d4a5a'
            : '0 -1px 0 0 var(--border-mid), 0 1px 0 0 var(--border-mid), -1px 0 0 0 var(--border-mid), 1px 0 0 0 var(--border-mid)',
          padding: '32px',
          marginBottom: '24px',
        }}
      >
        {/* Category row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <PixelBadge category={secret.category} />
          {secret.isGhost && (
            <span
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#00ffff',
                textShadow: '0 0 8px #00ffff',
                background: 'rgba(0,255,255,0.1)',
                padding: '5px 8px',
              }}
            >
              👻 GHOST SECRET
            </span>
          )}
          {secret.status === 'WINNER' && (
            <span
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#ffd700',
                textShadow: '0 0 8px #ffd700',
                background: 'rgba(255,215,0,0.1)',
                padding: '5px 8px',
              }}
            >
              🏆 WINNER
            </span>
          )}
          {secret.aiExplosiveScore !== undefined && (
            <span
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: secret.aiExplosiveScore >= 80 ? '#ff4444' : '#ffd700',
                textShadow: secret.aiExplosiveScore >= 80 ? '0 0 6px #ff4444' : 'none',
                background: 'rgba(255,255,255,0.04)',
                padding: '5px 8px',
              }}
            >
              ⚡ EXPLOSIVE SCORE: {secret.aiExplosiveScore}/100
            </span>
          )}
        </div>

        {/* Hint text */}
        {displayHint && (
          <div
            style={{
              background: 'rgba(0,255,255,0.05)',
              boxShadow: '0 -2px 0 0 #00ffff44, 0 2px 0 0 #00ffff44, -2px 0 0 0 #00ffff44, 2px 0 0 0 #00ffff44',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#00ffff',
                marginBottom: '8px',
              }}
            >
              💬 {secret.hasPeeked || revealedHint ? 'FULL HINT (PEEKED)' : 'HINT:'}
            </div>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '10px',
                color: '#c8e8f8',
                lineHeight: '2',
              }}
            >
              &ldquo;{displayHint}&rdquo;
            </p>
          </div>
        )}

        {/* Media / Link attachment */}
        {secret.mediaUrl && secret.mediaType === 'image' && (
          <div style={{ marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={secret.mediaUrl}
              alt=""
              style={{
                width: '100%',
                maxHeight: '480px',
                objectFit: 'contain',
                display: 'block',
                background: '#0a0d12',
                filter: secret.isGhost && !secret.hasUnlocked ? 'blur(14px)' : 'none',
                transform: secret.isGhost && !secret.hasUnlocked ? 'scale(1.06)' : 'none',
              }}
            />
            {secret.isGhost && !secret.hasUnlocked && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                UNLOCK TO VIEW MEDIA
              </div>
            )}
          </div>
        )}
        {secret.mediaUrl && secret.mediaType === 'video' && (
          secret.isGhost && !secret.hasUnlocked ? (
            <div style={{ marginBottom: '20px', background: '#0a0d12', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 0 0 1px var(--border)' }}>
              <div style={{ fontSize: '32px', opacity: 0.3 }}>▶</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-dim)' }}>VIDEO LOCKED</div>
            </div>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <video src={secret.mediaUrl} controls style={{ width: '100%', maxHeight: '480px', display: 'block', background: '#0a0d12' }} />
            </div>
          )
        )}
        {secret.mediaUrl && secret.mediaType === 'document' && !secret.isGhost && (
          <a href={secret.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-dark)', padding: '14px', marginBottom: '20px', boxShadow: '0 0 0 1px var(--border)', transition: 'box-shadow 0.1s' }}>
            <span style={{ fontSize: '24px', opacity: 0.6 }}>📄</span>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-primary)', marginBottom: '4px' }}>VIEW DOCUMENT</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-secondary)' }}>Click to open in new tab</div>
            </div>
          </a>
        )}
        {secret.linkUrl && !secret.isGhost && (
          <a href={secret.linkUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-dark)', padding: '14px', marginBottom: '20px', boxShadow: '0 0 0 1px var(--border)' }}>
            <span style={{ fontSize: '22px', opacity: 0.6 }}>🔗</span>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-primary)', marginBottom: '4px' }}>{secret.linkTitle || secret.linkDomain}</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-secondary)' }}>{secret.linkDomain}</div>
            </div>
          </a>
        )}

        {/* Main content */}
        {displayContent ? (
          <div
            style={{
              marginBottom: '24px',
              padding: '20px',
              background: '#0d1525',
              boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555',
            }}
          >
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '11px',
                color: '#e8e8e8',
                lineHeight: '2.4',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {displayContent}
            </p>
          </div>
        ) : secret.isGhost && !revealedContent ? (
          <div style={{ marginBottom: '24px' }}>
            {/* Blurred preview */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '20px',
                background: '#0d1525',
                boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555',
                marginBottom: '16px',
              }}
            >
              {['This content is hidden behind a Ghost paywall.', 'Pay to peek at the hint or unlock the full secret.', 'The secret holder earns from every unlock.'].map((line, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '10px',
                    color: '#4a5568',
                    lineHeight: '2',
                    filter: 'blur(4px)',
                    userSelect: 'none',
                    marginBottom: '4px',
                    opacity: 1 - i * 0.2,
                  }}
                >
                  {line}
                </p>
              ))}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '60%',
                  background: 'linear-gradient(to bottom, transparent, #0d1525)',
                }}
              />
            </div>

            {/* Unlock CTAs */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {secret.peekPrice && !secret.hasPeeked && (
                <button
                  onClick={() => setShowPeek(true)}
                  className="pixel-btn pixel-btn-cyan"
                >
                  👁️ PEEK HINT — {formatCurrency(secret.peekPrice)}
                </button>
              )}
              {secret.unlockPrice && !secret.hasUnlocked && (
                <button
                  onClick={() => setShowUnlock(true)}
                  className="pixel-btn pixel-btn-gold"
                >
                  🔓 UNLOCK FULL — {formatCurrency(secret.unlockPrice)}
                </button>
              )}
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '7px',
                  color: '#8899aa',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {secret.peekCount} PEEKED
              </div>
            </div>
          </div>
        ) : null}

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '16px',
            boxShadow: 'inset 0 2px 0 0 #2a3555',
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '8px',
              color: '#8899aa',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {secret.codename && (
              <span style={{ color: '#00ffff', textShadow: '0 0 6px #00ffff44' }}>
                {secret.codename}
              </span>
            )}
            <span>{formatTimeAgo(secret.createdAt)}</span>
            <span>{secret.shareCount} SHARES</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <VoteButton
              secretId={secret.id}
              initialCount={secret.voteCount}
              hasVoted={secret.hasVoted}
            />
            <button
              onClick={handleShare}
              className="pixel-btn pixel-btn-ghost pixel-btn-sm"
            >
              {copied ? '✓ COPIED' : '🔗 SHARE'}
            </button>
          </div>
        </div>
      </div>

      {/* Reaction bar */}
      <div
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 -4px 0 0 #2a3555, 0 4px 0 0 #2a3555, -4px 0 0 0 #2a3555, 4px 0 0 0 #2a3555',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <ReactionBar secretId={secret.id} initialCount={secret.reactionCount} />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '24px',
        }}
      >
        {[
          { label: 'VOTES', value: secret.voteCount, color: '#ffd700' },
          { label: 'REACTIONS', value: secret.reactionCount, color: '#ff6b35' },
          { label: 'COMMENTS', value: secret.commentCount, color: '#00ffff' },
          { label: 'SHARES', value: secret.shareCount, color: '#b44fff' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-card)',
              padding: '16px',
              textAlign: 'center',
              boxShadow: `0 -2px 0 0 ${stat.color}44, 0 2px 0 0 ${stat.color}44, -2px 0 0 0 ${stat.color}44, 2px 0 0 0 ${stat.color}44`,
            }}
          >
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '18px',
                color: stat.color,
                textShadow: `0 0 8px ${stat.color}66`,
                marginBottom: '6px',
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: '#8899aa',
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Comments */}
      <div
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 -4px 0 0 #2a3555, 0 4px 0 0 #2a3555, -4px 0 0 0 #2a3555, 4px 0 0 0 #2a3555',
          padding: '24px',
        }}
      >
        <CommentSection secretId={secret.id} initialComments={comments} />
      </div>

      {/* Modals */}
      {secret.peekPrice && (
        <PeekModal
          isOpen={showPeek}
          onClose={() => setShowPeek(false)}
          secretId={secret.id}
          peekPrice={secret.peekPrice}
          onSuccess={(hint) => {
            setRevealedHint(hint);
            setShowPeek(false);
          }}
        />
      )}

      {secret.unlockPrice && (
        <UnlockModal
          isOpen={showUnlock}
          onClose={() => setShowUnlock(false)}
          secretId={secret.id}
          unlockPrice={secret.unlockPrice}
          onSuccess={(content) => {
            setRevealedContent(content);
            setShowUnlock(false);
          }}
        />
      )}
    </div>
  );
}
