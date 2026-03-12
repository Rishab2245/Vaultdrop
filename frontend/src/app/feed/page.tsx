'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import SecretCard from '@/components/feed/SecretCard';
import FeedFilters from '@/components/feed/FeedFilters';
import PrizePoolWidget from '@/components/pool/PrizePoolWidget';
import LeaderboardTable from '@/components/pool/LeaderboardTable';
import LoadingPixels from '@/components/ui/LoadingPixels';
import { Secret, FeedFilters as FiltersType, DailyPool, LeaderboardEntry } from '@/types';
import { fetchGraphQL } from '@/lib/api';
import { GET_SECRETS_FEED, GET_DAILY_POOL, GET_LEADERBOARD } from '@/lib/queries';

const SORT_MAP: Record<string, string> = { HOT: 'rank', NEW: 'new', TOP: 'votes' };

export default function FeedPage() {
  const [filters, setFilters] = useState<FiltersType>({
    category: 'ALL',
    sort: 'HOT',
    ghostOnly: false,
  });
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [pool, setPool] = useState<DailyPool | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  // Load pool + leaderboard sidebar data
  useEffect(() => {
    Promise.all([
      fetchGraphQL<{ dailyPool: DailyPool }>(GET_DAILY_POOL).catch(() => null),
      fetchGraphQL<{ leaderboard: LeaderboardEntry[] }>(GET_LEADERBOARD, { limit: 5 }).catch(() => null),
    ]).then(([poolData, lbData]) => {
      if (poolData) setPool(poolData.dailyPool);
      if (lbData) setLeaderboard(lbData.leaderboard);
    });
  }, []);

  const loadSecrets = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const vars: Record<string, unknown> = {
        limit: 10,
        sort: SORT_MAP[filters.sort ?? 'HOT'] ?? 'rank',
        ghostOnly: filters.ghostOnly || undefined,
      };
      if (filters.category !== 'ALL') vars.category = filters.category;
      if (!reset && cursor) vars.cursor = cursor;

      const data = await fetchGraphQL<{
        feed: { items: Secret[]; nextCursor: string | null; total: number };
      }>(GET_SECRETS_FEED, vars);

      setSecrets(reset ? data.feed.items : (prev) => [...prev, ...data.feed.items]);
      setHasMore(!!data.feed.nextCursor);
      setCursor(data.feed.nextCursor ?? undefined);
    } catch (err) {
      console.error('Feed load error:', err);
      if (reset) setSecrets([]);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, cursor]);

  useEffect(() => {
    setCursor(undefined);
    loadSecrets(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 20px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '16px', color: 'var(--amber)', marginBottom: '6px', letterSpacing: '2px' }}>
            VAULT FEED
          </h1>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>
              <span style={{ color: '#3d7a54' }}>●</span>
              {' '}{secrets.length} secrets
            </span>
            {pool && (
              <span style={{ color: 'var(--text-dim)' }}>
                pool ${pool.totalAmount.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <Link href="/submit" className="pixel-btn pixel-btn-gold" style={{ textDecoration: 'none' }}>
          POST SECRET
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '28px' }}>
        {/* Main feed */}
        <div>
          <FeedFilters filters={filters} onChange={setFilters} totalCount={secrets.length} />

          {isLoading && secrets.length === 0 ? (
            <LoadingPixels label="LOADING..." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {secrets.map((secret, i) => (
                <div key={secret.id} className="animate-pixel-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  <SecretCard secret={secret} rank={i + 1} />
                </div>
              ))}

              {secrets.length === 0 && !isLoading && (
                <div style={{ textAlign: 'center', padding: '48px', fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: 'var(--text-secondary)', boxShadow: '0 -1px 0 0 var(--border), 0 1px 0 0 var(--border), -1px 0 0 0 var(--border), 1px 0 0 0 var(--border)' }}>
                  NO SECRETS YET.
                  <br /><br />
                  BE THE FIRST TO POST.
                </div>
              )}

              {hasMore && secrets.length > 0 && (
                <button onClick={() => loadSecrets(false)} disabled={isLoading} className="pixel-btn pixel-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                  {isLoading ? 'LOADING...' : '▼ LOAD MORE'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PrizePoolWidget initialPool={pool} />

          {leaderboard.length > 0 && (
            <div style={{ background: 'var(--bg-card)', boxShadow: '0 -1px 0 0 var(--border-mid), 0 1px 0 0 var(--border-mid), -1px 0 0 0 var(--border-mid), 1px 0 0 0 var(--border-mid)', padding: '18px' }}>
              <LeaderboardTable entries={leaderboard} compact showHeader />
            </div>
          )}

          {/* Ghost CTA */}
          <div style={{ background: '#0e1520', boxShadow: '0 -1px 0 0 #2d4a5a, 0 1px 0 0 #2d4a5a, -1px 0 0 0 #2d4a5a, 1px 0 0 0 #2d4a5a', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#4a7fa5', marginBottom: '8px', letterSpacing: '1px' }}>
              GHOST SECRET
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', lineHeight: '2.2', marginBottom: '14px' }}>
              Hide behind a paywall.<br />Earn every unlock.
            </div>
            <Link href="/how-it-works" className="pixel-btn pixel-btn-cyan pixel-btn-sm" style={{ textDecoration: 'none' }}>
              LEARN MORE
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
