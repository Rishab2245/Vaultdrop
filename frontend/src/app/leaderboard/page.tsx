'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry, DailyPool } from '@/types';
import LeaderboardTable from '@/components/pool/LeaderboardTable';
import PrizePoolWidget from '@/components/pool/PrizePoolWidget';
import LoadingPixels from '@/components/ui/LoadingPixels';
import CoinAmount from '@/components/ui/CoinAmount';
import { fetchGraphQL } from '@/lib/api';
import { GET_LEADERBOARD, GET_DAILY_POOL } from '@/lib/queries';
import { formatDate } from '@/lib/utils/formatters';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [pool, setPool] = useState<DailyPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchGraphQL<{ leaderboard: LeaderboardEntry[] }>(GET_LEADERBOARD, { date: selectedDate, limit: 20 }),
      fetchGraphQL<{ dailyPool: DailyPool }>(GET_DAILY_POOL),
    ])
      .then(([lbData, poolData]) => {
        setEntries(lbData.leaderboard);
        setPool(poolData.dailyPool);
      })
      .catch((err) => {
        console.error('Leaderboard load error:', err);
        setEntries([]);
      })
      .finally(() => setIsLoading(false));
  }, [selectedDate]);

  // Generate past 7 days
  const pastDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '24px',
            color: '#ffd700',
            textShadow: '0 0 16px #ffd700, 0 0 32px #ffd700',
            marginBottom: '12px',
            letterSpacing: '3px',
          }}
        >
          🏆 LEADERBOARD
        </h1>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#8899aa' }}>
          TOP SECRETS BY RANK SCORE — WINNER TAKES THE POOL
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px' }}>
        {/* Main leaderboard */}
        <div>
          {/* Date tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {pastDays.map((date, i) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '7px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  border: 'none',
                  background: selectedDate === date ? '#ffd700' : '#1a2035',
                  color: selectedDate === date ? '#000' : '#8899aa',
                  boxShadow: selectedDate === date
                    ? '0 3px 0 0 #b8960c, 0 -2px 0 0 #ffd700, -2px 0 0 0 #ffd700, 2px 0 0 0 #ffd700'
                    : '0 3px 0 0 #2a3555, 0 -2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555',
                  transition: 'all 0.1s',
                }}
              >
                {i === 0 ? 'TODAY' : formatDate(date).slice(0, 5)}
              </button>
            ))}
          </div>

          {/* Winner podium (top 3) */}
          {!isLoading && entries.length >= 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {entries.slice(0, 3).map((entry) => {
                const podiumColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                const color = podiumColors[entry.rank - 1];
                const icons = ['🏆', '🥈', '🥉'];
                return (
                  <div
                    key={entry.rank}
                    style={{
                      background: 'var(--bg-card)',
                      boxShadow: `0 -4px 0 0 ${color}, 0 4px 0 0 ${color}, -4px 0 0 0 ${color}, 4px 0 0 0 ${color}`,
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icons[entry.rank - 1]}</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color, textShadow: `0 0 6px ${color}`, marginBottom: '8px' }}>
                      #{entry.rank}
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#00ffff', marginBottom: '6px', wordBreak: 'break-all' }}>
                      {entry.secret.codename?.slice(0, 16) ?? 'ANON'}...
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#ffd700' }}>
                      ▲ {entry.secret.voteCount}
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa', marginTop: '4px' }}>
                      {Math.round(entry.score)} PTS
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          {isLoading ? (
            <LoadingPixels />
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px', fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#8899aa', boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555' }}>
              NO ENTRIES FOR THIS DATE YET.
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', boxShadow: '0 -4px 0 0 #2a3555, 0 4px 0 0 #2a3555, -4px 0 0 0 #2a3555, 4px 0 0 0 #2a3555', padding: '24px' }}>
              <LeaderboardTable entries={entries} showHeader={false} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <PrizePoolWidget initialPool={pool} />

          {/* Rank score formula */}
          <div style={{ background: 'var(--bg-card)', boxShadow: '0 -4px 0 0 #2a3555, 0 4px 0 0 #2a3555, -4px 0 0 0 #2a3555, 4px 0 0 0 #2a3555', padding: '20px', marginTop: '20px' }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#ffd700', marginBottom: '16px' }}>
              ⚡ RANK SCORE FORMULA
            </div>
            {[
              { label: 'VOTES', weight: '40%', color: '#ffd700' },
              { label: 'REACTIONS', weight: '20%', color: '#ff6b35' },
              { label: 'COMMENTS', weight: '20%', color: '#00ffff' },
              { label: 'AI EXPLOSIVE', weight: '15%', color: '#ff4444' },
              { label: 'SHARES', weight: '5%', color: '#b44fff' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa' }}>{item.label}</div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: item.color, textShadow: `0 0 6px ${item.color}66` }}>{item.weight}</div>
              </div>
            ))}
          </div>

          {/* Prize breakdown */}
          {pool && (
            <div style={{ background: 'var(--bg-card)', boxShadow: '0 -4px 0 0 #44ff44, 0 4px 0 0 #44ff44, -4px 0 0 0 #44ff44, 4px 0 0 0 #44ff44', padding: '20px', marginTop: '20px' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#44ff44', marginBottom: '16px' }}>
                🪙 PRIZE BREAKDOWN
              </div>
              {[
                { place: '#1', pct: 60, label: 'WINNER', color: '#ffd700' },
                { place: '#2', pct: 25, label: 'RUNNER UP', color: '#c0c0c0' },
                { place: '#3', pct: 15, label: 'THIRD', color: '#cd7f32' },
              ].map((item) => (
                <div key={item.place} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', boxShadow: 'inset 0 -1px 0 0 #2a3555', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: item.color }}>{item.place}</span>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa' }}>{item.label}</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: item.color }}>{item.pct}%</span>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa', textAlign: 'right' }}>
                      <CoinAmount amount={pool.totalAmount * item.pct / 100} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 320px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: 1fr 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
