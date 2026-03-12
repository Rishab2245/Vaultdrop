'use client';

import { useState } from 'react';
import { fetchGraphQL } from '@/lib/api';
import { REACT_TO_SECRET } from '@/lib/mutations';
import { useSessionStore } from '@/lib/hooks/useSession';

type ReactionType = 'SHOCKED' | 'WATCHING' | 'SKULL' | 'FIRE' | 'LIT';

interface ReactionBarProps {
  secretId: string;
  initialCount: number;
}

const REACTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: 'SHOCKED', emoji: '🔥', label: 'SHOCKED' },
  { type: 'WATCHING', emoji: '👁', label: 'WATCHING' },
  { type: 'SKULL', emoji: '💀', label: 'SKULL' },
  { type: 'FIRE', emoji: '⚡', label: 'LIT' },
  { type: 'LIT', emoji: '💣', label: 'BOMB' },
];

export default function ReactionBar({ secretId, initialCount }: ReactionBarProps) {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({ SHOCKED: 0, WATCHING: 0, SKULL: 0, FIRE: 0, LIT: 0 });
  const [reacted, setReacted] = useState<Set<ReactionType>>(new Set());
  const [totalCount, setTotalCount] = useState(initialCount);
  const { session } = useSessionStore();

  const handleReact = async (type: ReactionType) => {
    if (reacted.has(type)) return;

    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    setReacted((prev) => { const next = new Set(prev); next.add(type); return next; });
    setTotalCount((prev) => prev + 1);

    try {
      const reaction = REACTIONS.find((r) => r.type === type);
      await fetchGraphQL(REACT_TO_SECRET, { secretId, emoji: reaction?.emoji ?? type }, session?.id);
    } catch {
      setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      setReacted((prev) => { const next = new Set(prev); next.delete(type); return next; });
      setTotalCount((prev) => prev - 1);
    }
  };

  return (
    <div>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', marginBottom: '10px', letterSpacing: '1px' }}>
        REACT {totalCount > 0 && <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>{totalCount}</span>}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {REACTIONS.map((r) => (
          <button
            key={r.type}
            onClick={() => handleReact(r.type)}
            title={r.label}
            style={{
              background: reacted.has(r.type) ? '#1e2535' : 'transparent',
              border: 'none',
              cursor: reacted.has(r.type) ? 'default' : 'pointer',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '7px',
              color: reacted.has(r.type) ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '8px 12px',
              boxShadow: reacted.has(r.type)
                ? '0 0 0 1px var(--border-mid)'
                : '0 0 0 1px var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.1s',
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>{r.emoji}</span>
            <span>{r.label}</span>
            {counts[r.type] > 0 && (
              <span style={{ color: 'var(--amber)', fontSize: '6px' }}>{counts[r.type]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
