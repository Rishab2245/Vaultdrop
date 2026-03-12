'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Secret } from '@/types';
import PixelBadge from '@/components/ui/PixelBadge';
import VoteButton from '@/components/feed/VoteButton';
import { formatTimeAgo, generateBlurText, formatCurrency } from '@/lib/utils/formatters';

interface GhostSecretCardProps {
  secret: Secret;
}

export default function GhostSecretCard({ secret }: GhostSecretCardProps) {
  const [copied, setCopied] = useState(false);

  const blurLine1 = generateBlurText(48);
  const blurLine2 = generateBlurText(36);

  const handleShare = async () => {
    const url = `${window.location.origin}/secret/${secret.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      style={{
        background: 'var(--bg-card)',
        boxShadow: '0 -1px 0 0 #2d4a5a, 0 1px 0 0 #2d4a5a, -1px 0 0 0 #2d4a5a, 1px 0 0 0 #2d4a5a',
        padding: '20px 22px',
        position: 'relative',
      }}
    >
      {/* Ghost tag */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: '#1e3040',
          color: '#4a7fa5',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '6px',
          padding: '3px 9px',
          letterSpacing: '1px',
        }}
      >
        GHOST
      </div>

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', marginTop: '8px' }}>
        <PixelBadge category={secret.category} />
        {secret.aiExplosiveScore && secret.aiExplosiveScore >= 70 && (
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: '#c04444', background: '#c0444415', padding: '3px 6px' }}>
            HOT
          </span>
        )}
      </div>

      {/* Hint */}
      {secret.hintText && (
        <div
          style={{
            background: '#0e1c28',
            borderLeft: '2px solid #2d4a5a',
            padding: '10px 13px',
            marginBottom: '14px',
          }}
        >
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: '#4a7fa5', marginBottom: '6px', opacity: 0.8 }}>
            HINT
          </div>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#8ab0c8', lineHeight: '2' }}>
            &ldquo;{secret.hintText}&rdquo;
          </p>
        </div>
      )}

      {/* Blurred media preview */}
      {secret.mediaUrl && secret.mediaType === 'image' && (
        <div style={{ marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={secret.mediaUrl} alt="" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block', filter: 'blur(12px)', transform: 'scale(1.05)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>UNLOCK TO VIEW</div>
          </div>
        </div>
      )}
      {secret.mediaUrl && secret.mediaType === 'video' && (
        <div style={{ marginBottom: '14px', position: 'relative', overflow: 'hidden', background: '#0a1020', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px', filter: 'grayscale(1)', opacity: 0.4 }}>▶</div>
            VIDEO LOCKED
          </div>
        </div>
      )}
      {secret.linkUrl && (
        <div style={{ background: '#0e1c28', borderLeft: '2px solid #1e3040', padding: '10px 12px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'center', filter: 'blur(2px)', userSelect: 'none' }}>
          <span style={{ fontSize: '16px', opacity: 0.4 }}>🔗</span>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-dim)' }}>████████████████</div>
        </div>
      )}

      {/* Blurred text preview */}
      <div style={{ marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#2a3a4a', lineHeight: '2', filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none' }}>
          {blurLine1}
        </p>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#2a3a4a', lineHeight: '2', filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none', opacity: 0.5 }}>
          {blurLine2}
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, transparent, var(--bg-card))' }} />
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
        {secret.peekPrice && (
          <Link
            href={`/secret/${secret.id}?action=peek`}
            style={{
              textDecoration: 'none',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '7px',
              color: '#bcc5d4',
              background: '#1e2535',
              padding: '7px 11px',
              boxShadow: '0 3px 0 0 #141b27',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            👁 PEEK {formatCurrency(secret.peekPrice)}
          </Link>
        )}
        {secret.unlockPrice && (
          <Link
            href={`/secret/${secret.id}?action=unlock`}
            className="pixel-btn-gold"
            style={{
              textDecoration: 'none',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '7px',
              color: '#0b0d12',
              background: '#c9a227',
              padding: '7px 11px',
              boxShadow: '0 3px 0 0 #8a6c14',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            UNLOCK {formatCurrency(secret.unlockPrice)}
          </Link>
        )}
        {secret.peekCount > 0 && (
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3a4558' }}>
            {secret.peekCount} peeked
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
          <span>{formatTimeAgo(secret.createdAt)}</span>
          {secret.bowl && (
            <Link href={`/bowls/${secret.bowl.slug}`} style={{ color: '#7a50a0', textDecoration: 'none' }}>
              {secret.bowl.coverEmoji} {secret.bowl.name}
            </Link>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <VoteButton secretId={secret.id} initialCount={secret.voteCount} hasVoted={secret.hasVoted} size="sm" />
          <Link href={`/secret/${secret.id}`} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3a4558', textDecoration: 'none' }}>
            💬 {secret.commentCount}
          </Link>
          <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: copied ? '#3d7a54' : '#3a4558' }}>
            {copied ? '✓' : 'SHARE'}
          </button>
        </div>
      </div>
    </article>
  );
}
