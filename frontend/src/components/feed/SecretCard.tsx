'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Secret } from '@/types';
import PixelBadge from '@/components/ui/PixelBadge';
import VoteButton from '@/components/feed/VoteButton';
import GhostSecretCard from '@/components/feed/GhostSecretCard';
import { formatTimeAgo, truncateText, formatLargeNumber } from '@/lib/utils/formatters';
import { fetchGraphQL } from '@/lib/api';
import { REACT_TO_SECRET } from '@/lib/mutations';
import { useSessionStore } from '@/lib/hooks/useSession';

interface SecretCardProps {
  secret: Secret;
  rank?: number;
}

type ReactionType = 'SHOCKED' | 'WATCHING' | 'SKULL' | 'FIRE' | 'LIT';

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'SHOCKED', emoji: '🔥' },
  { type: 'WATCHING', emoji: '👁' },
  { type: 'SKULL', emoji: '💀' },
  { type: 'FIRE', emoji: '⚡' },
  { type: 'LIT', emoji: '💣' },
];

export default function SecretCard({ secret, rank }: SecretCardProps) {
  const [reactionCount, setReactionCount] = useState(secret.reactionCount);
  const [copied, setCopied] = useState(false);
  const { session } = useSessionStore();

  if (secret.isGhost) {
    return <GhostSecretCard secret={secret} />;
  }

  const handleReact = async (reactionType: ReactionType) => {
    setReactionCount((prev) => prev + 1);
    const r = REACTIONS.find((x) => x.type === reactionType);
    try {
      await fetchGraphQL(REACT_TO_SECRET, { secretId: secret.id, emoji: r?.emoji ?? reactionType }, session?.id);
    } catch {
      setReactionCount((prev) => prev - 1);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/secret/${secret.id}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explosiveScore = secret.aiExplosiveScore ?? 0;
  const scoreColor = explosiveScore >= 80 ? '#c04444' : explosiveScore >= 60 ? '#c9a227' : '#6a7a8e';

  return (
    <article
      style={{
        background: 'var(--bg-card)',
        boxShadow: '0 -1px 0 0 var(--border), 0 1px 0 0 var(--border), -1px 0 0 0 var(--border), 1px 0 0 0 var(--border)',
        padding: '20px 22px',
        position: 'relative',
        transition: 'background 0.12s',
      }}
    >
      {/* Rank stripe — top-left corner accent */}
      {rank && rank <= 3 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            background: rank === 1 ? '#c9a227' : rank === 2 ? '#7a8898' : '#7a5030',
            color: '#0b0d12',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '6px',
            padding: '3px 8px',
            letterSpacing: '1px',
          }}
        >
          {rank === 1 ? '#1' : rank === 2 ? '#2' : '#3'}
        </div>
      )}

      {/* Top row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '14px',
          marginTop: rank && rank <= 3 ? '12px' : '0',
        }}
      >
        <PixelBadge category={secret.category} />

        {secret.aiExplosiveScore !== undefined && (
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '6px',
              color: scoreColor,
              padding: '3px 6px',
              background: `${scoreColor}18`,
              letterSpacing: '1px',
            }}
          >
            {secret.aiExplosiveScore}/100
          </span>
        )}

        {secret.bowl && (
          <Link
            href={`/bowls/${secret.bowl.slug}`}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '6px',
              color: '#7a50a0',
              textDecoration: 'none',
              background: 'rgba(122,80,160,0.1)',
              padding: '3px 6px',
            }}
          >
            {secret.bowl.coverEmoji} {secret.bowl.name}
          </Link>
        )}
      </div>

      {/* Media */}
      {secret.mediaUrl && secret.mediaType === 'image' && (
        <Link href={`/secret/${secret.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '14px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={secret.mediaUrl} alt="" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }} />
        </Link>
      )}
      {secret.mediaUrl && secret.mediaType === 'video' && (
        <div style={{ marginBottom: '14px' }}>
          <video src={secret.mediaUrl} controls style={{ width: '100%', maxHeight: '280px', display: 'block' }} />
        </div>
      )}
      {secret.mediaUrl && secret.mediaType === 'document' && (
        <a href={secret.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-dark)', padding: '12px', marginBottom: '14px', boxShadow: '0 0 0 1px var(--border)' }}>
          <span style={{ fontSize: '22px', opacity: 0.6 }}>📄</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)' }}>VIEW DOCUMENT</span>
        </a>
      )}
      {secret.linkUrl && (
        <a href={secret.linkUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-dark)', padding: '12px', marginBottom: '14px', boxShadow: '0 0 0 1px var(--border)' }}>
          <span style={{ fontSize: '18px', opacity: 0.6 }}>🔗</span>
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-primary)', marginBottom: '3px' }}>{secret.linkTitle || secret.linkDomain}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-secondary)' }}>{secret.linkDomain}</div>
          </div>
        </a>
      )}

      {/* Content */}
      <Link href={`/secret/${secret.id}`} style={{ textDecoration: 'none' }}>
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '9px',
            color: '#bcc5d4',
            lineHeight: '2.2',
            marginBottom: '18px',
            cursor: 'pointer',
          }}
        >
          {secret.content ? truncateText(secret.content, 200) : ''}
        </p>
      </Link>

      {/* Reactions */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
        {REACTIONS.map((r) => (
          <button
            key={r.type}
            onClick={() => handleReact(r.type)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px 6px',
              opacity: 0.6,
              transition: 'opacity 0.1s, transform 0.1s',
              lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {r.emoji}
          </button>
        ))}
        {reactionCount > 0 && (
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3a4558', marginLeft: '4px' }}>
            {formatLargeNumber(reactionCount)}
          </span>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '7px',
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
          }}
        >
          {secret.codename && (
            <span style={{ color: '#4a7fa5' }}>{secret.codename}</span>
          )}
          <span>{formatTimeAgo(secret.createdAt)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <VoteButton
            secretId={secret.id}
            initialCount={secret.voteCount}
            hasVoted={secret.hasVoted}
            size="sm"
          />

          <Link
            href={`/secret/${secret.id}#comments`}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '7px',
              color: '#3a4558',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 8px',
              background: 'transparent',
              transition: 'color 0.1s',
            }}
          >
            💬 {secret.commentCount}
          </Link>

          <button
            onClick={handleShare}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '7px',
              color: copied ? '#3d7a54' : '#3a4558',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 8px',
              transition: 'color 0.15s',
            }}
          >
            {copied ? '✓ COPIED' : 'SHARE'}
          </button>
        </div>
      </div>
    </article>
  );
}
