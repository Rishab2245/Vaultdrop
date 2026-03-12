'use client';

import { useState, useEffect } from 'react';
import { HallOfFameEntry, SecretCategory } from '@/types';
import PixelBadge from '@/components/ui/PixelBadge';
import CoinAmount from '@/components/ui/CoinAmount';
import LoadingPixels from '@/components/ui/LoadingPixels';
import { fetchGraphQL } from '@/lib/api';
import { GET_HALL_OF_FAME } from '@/lib/queries';
import { formatDate } from '@/lib/utils/formatters';

const CATEGORIES_FILTER: Array<SecretCategory | 'ALL'> = [
  'ALL', 'CORPORATE', 'POLITICAL', 'CELEBRITY', 'PERSONAL', 'INDUSTRY', 'PARANORMAL', 'ZERO_DAY',
];

export default function HallOfFamePage() {
  const [allEntries, setAllEntries] = useState<HallOfFameEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState<SecretCategory | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchGraphQL<{ hallOfFame: { items: HallOfFameEntry[]; nextCursor: string | null } }>(
      GET_HALL_OF_FAME,
      { limit: 50 }
    )
      .then((data) => setAllEntries(data.hallOfFame.items))
      .catch((err) => {
        console.error('Hall of fame load error:', err);
        setAllEntries([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const entries = filterCategory === 'ALL'
    ? allEntries
    : allEntries.filter((e) => e.category === filterCategory);

  const totalPrizes = allEntries.reduce((sum, e) => sum + e.prizeAmount, 0);
  const topWinner = allEntries.reduce<HallOfFameEntry | null>(
    (max, e) => !max || e.prizeAmount > max.prizeAmount ? e : max,
    null
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '24px', color: '#ffd700', textShadow: '0 0 16px #ffd700, 0 0 32px #ffd700', marginBottom: '12px', letterSpacing: '3px' }}>
          HALL OF FAME
        </h1>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#8899aa' }}>
          THE LEGENDS WHO WON THE VAULT
        </p>
      </div>

      {/* Stats banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '40px' }}>
        {[
          { label: 'TOTAL PAID OUT', value: <CoinAmount amount={totalPrizes} size="md" glow />, color: '#ffd700' },
          { label: 'ALL-TIME WINNER', value: topWinner ? <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#00ffff' }}>{topWinner.codename?.slice(0, 14)}...</span> : <span style={{ color: '#8899aa', fontSize: '9px' }}>—</span>, color: '#00ffff' },
          { label: 'WINNERS', value: <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '20px', color: '#44ff44', textShadow: '0 0 8px #44ff44' }}>{allEntries.length}</span>, color: '#44ff44' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', boxShadow: `0 -4px 0 0 ${stat.color}44, 0 4px 0 0 ${stat.color}44, -4px 0 0 0 ${stat.color}44, 4px 0 0 0 ${stat.color}44`, padding: '20px', textAlign: 'center' }}>
            <div style={{ marginBottom: '8px' }}>{stat.value}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {CATEGORIES_FILTER.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cat !== 'ALL' ? `badge-${cat}` : ''}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '7px',
              padding: '6px 10px',
              cursor: 'pointer',
              border: 'none',
              background: cat === 'ALL' ? (filterCategory === 'ALL' ? '#ffd700' : '#2a3555') : undefined,
              color: cat === 'ALL' ? (filterCategory === 'ALL' ? '#000' : '#8899aa') : undefined,
              opacity: filterCategory === cat || filterCategory === 'ALL' ? 1 : 0.5,
              outline: filterCategory === cat ? '2px solid currentColor' : '2px solid transparent',
              outlineOffset: '2px',
              transition: 'opacity 0.2s',
            }}
          >
            {cat === 'ALL' ? '🎮 ALL' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* HOF grid */}
      {isLoading ? (
        <LoadingPixels />
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#8899aa' }}>
          👻 NO WINNERS YET{filterCategory !== 'ALL' ? ` FOR ${filterCategory}` : ''}.
          <br /><br />
          BE THE FIRST.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="animate-pixel-in"
              style={{
                background: 'var(--bg-card)',
                boxShadow: i === 0
                  ? '0 -4px 0 0 #ffd700, 0 4px 0 0 #ffd700, -4px 0 0 0 #ffd700, 4px 0 0 0 #ffd700'
                  : '0 -4px 0 0 #2a3555, 0 4px 0 0 #2a3555, -4px 0 0 0 #2a3555, 4px 0 0 0 #2a3555',
                padding: '24px',
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#8899aa' }}>
                  {formatDate(entry.winDate)}
                </span>
                {i === 0 && (
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#ffd700', background: 'rgba(255,215,0,0.1)', padding: '3px 6px' }}>
                    🏆 LATEST WINNER
                  </span>
                )}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <PixelBadge category={entry.category} size="sm" />
              </div>
              <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#e8e8e8', lineHeight: '2.2', marginBottom: '16px' }}>
                &ldquo;{entry.snippet}&rdquo;
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', boxShadow: 'inset 0 2px 0 0 #2a3555', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa', marginBottom: '4px' }}>WINNER</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#00ffff', textShadow: '0 0 6px #00ffff44' }}>
                    {entry.codename.length > 16 ? entry.codename.slice(0, 16) + '...' : entry.codename}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa', marginBottom: '4px' }}>PRIZE</div>
                  <CoinAmount amount={entry.prizeAmount} size="md" glow={i === 0} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(3, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
