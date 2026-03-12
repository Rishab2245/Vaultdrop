'use client';

import { useState, useRef } from 'react';
import { fetchGraphQL } from '@/lib/api';
import { VOTE_SECRET, UNVOTE_SECRET } from '@/lib/mutations';
import { useSessionStore } from '@/lib/hooks/useSession';
import { formatLargeNumber } from '@/lib/utils/formatters';

interface VoteButtonProps {
  secretId: string;
  initialCount: number;
  hasVoted: boolean;
  size?: 'sm' | 'md';
}

interface FloatingVote {
  id: number;
  x: number;
}

export default function VoteButton({
  secretId,
  initialCount,
  hasVoted: initialHasVoted,
  size = 'md',
}: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [isAnimating, setIsAnimating] = useState(false);
  const [floatingVotes, setFloatingVotes] = useState<FloatingVote[]>([]);
  const { session } = useSessionStore();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);

  const handleVote = async () => {
    if (isAnimating) return;

    // Optimistic update
    const newVoted = !hasVoted;
    const newCount = newVoted ? voteCount + 1 : voteCount - 1;
    setHasVoted(newVoted);
    setVoteCount(newCount);
    setIsAnimating(true);

    if (newVoted) {
      // Show floating +1
      const id = nextId.current++;
      const x = Math.random() * 40 - 20;
      setFloatingVotes((prev) => [...prev, { id, x }]);
      setTimeout(() => {
        setFloatingVotes((prev) => prev.filter((v) => v.id !== id));
      }, 800);
    }

    setTimeout(() => setIsAnimating(false), 300);

    try {
      const mutation = newVoted ? VOTE_SECRET : UNVOTE_SECRET;
      const data = await fetchGraphQL<{ voteSecret?: { voteCount: number }; removeVote?: { voteCount: number } }>(
        mutation,
        { id: secretId },
        session?.id
      );
      const result = data.voteSecret ?? data.removeVote;
      if (result) {
        setVoteCount(result.voteCount);
      }
    } catch {
      // Revert on error
      setHasVoted(!newVoted);
      setVoteCount(voteCount);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Floating +1s */}
      {floatingVotes.map((fv) => (
        <div
          key={fv.id}
          style={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: `translateX(calc(-50% + ${fv.x}px))`,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '10px',
            color: '#c9a227',
            animation: 'floatUp 0.8s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          +1
        </div>
      ))}

      <button
        ref={buttonRef}
        onClick={handleVote}
        style={{
          background: hasVoted ? '#c9a22720' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: isSmall ? '7px' : '9px',
          color: hasVoted ? '#c9a227' : '#6a7a8e',
          display: 'flex',
          alignItems: 'center',
          gap: isSmall ? '4px' : '6px',
          padding: isSmall ? '5px 9px' : '7px 12px',
          boxShadow: hasVoted
            ? '0 0 0 1px #c9a22766'
            : '0 0 0 1px #1e2535',
          transition: 'all 0.1s',
          transform: isAnimating && hasVoted ? 'translateY(1px)' : 'none',
        }}
        aria-label={hasVoted ? 'Remove vote' : 'Vote for this secret'}
      >
        <span
          style={{
            fontSize: isSmall ? '12px' : '14px',
            transform: hasVoted ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}
        >
          ▲
        </span>
        <span style={{ minWidth: isSmall ? '20px' : '28px', textAlign: 'center' }}>
          {formatLargeNumber(voteCount)}
        </span>
      </button>
    </div>
  );
}
