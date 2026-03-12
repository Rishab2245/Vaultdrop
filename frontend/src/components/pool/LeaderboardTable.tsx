import Link from 'next/link';
import { LeaderboardEntry } from '@/types';
import PixelBadge from '@/components/ui/PixelBadge';
import { formatLargeNumber, truncateText } from '@/lib/utils/formatters';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  compact?: boolean;
  showHeader?: boolean;
}

const RANK_COLORS = ['#c9a227', '#6a7a8e', '#7a5030'];

export default function LeaderboardTable({ entries, compact = false, showHeader = true }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
        NO ENTRIES YET
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '2px' }}>
          LEADERBOARD
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {entries.map((entry) => {
          const rankColor = RANK_COLORS[entry.rank - 1] ?? 'var(--text-dim)';
          const secret = entry.secret;

          return (
            <Link key={entry.rank} href={`/secret/${secret.id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: compact ? '8px 10px' : '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderLeft: `2px solid ${rankColor}55`,
                  transition: 'background 0.1s',
                  cursor: 'pointer',
                }}
              >
                {/* Rank */}
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: compact ? '8px' : '9px', minWidth: '24px', color: rankColor, textAlign: 'center', flexShrink: 0 }}>
                  #{entry.rank}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!compact && (
                    <div style={{ marginBottom: '3px' }}>
                      <PixelBadge category={secret.category} size="sm" />
                    </div>
                  )}
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: compact ? '7px' : '8px', color: secret.isGhost ? '#4a7fa5' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {secret.isGhost
                      ? (secret.hintText ? truncateText(secret.hintText, 30) : 'GHOST SECRET')
                      : truncateText(secret.content ?? '...', 40)}
                  </div>
                  {!compact && secret.codename && (
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)', marginTop: '3px' }}>
                      {secret.codename}
                    </div>
                  )}
                </div>

                {/* Score */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: compact ? '7px' : '8px', color: 'var(--amber)' }}>
                    ▲ {formatLargeNumber(secret.voteCount)}
                  </div>
                  {!compact && (
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)' }}>
                      {Math.round(entry.score)} pts
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {compact && (
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <Link href="/leaderboard" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            VIEW FULL BOARD →
          </Link>
        </div>
      )}
    </div>
  );
}
