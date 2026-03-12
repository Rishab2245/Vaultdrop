'use client';

import { useState, useEffect } from 'react';
import { Bowl } from '@/types';
import BowlCard from '@/components/bowls/BowlCard';
import LoadingPixels from '@/components/ui/LoadingPixels';
import { fetchGraphQL } from '@/lib/api';
import { GET_BOWLS } from '@/lib/queries';

export default function BowlsPage() {
  const [bowls, setBowls] = useState<Bowl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE' | 'JOINED'>('ALL');

  useEffect(() => {
    fetchGraphQL<{ bowls: { items: Bowl[]; nextCursor: string | null } }>(GET_BOWLS)
      .then((data) => setBowls(data.bowls.items))
      .catch((err) => {
        console.error('Bowls load error:', err);
        setBowls([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredBowls = bowls.filter((b) => {
    if (filter === 'PUBLIC') return !b.isPrivate;
    if (filter === 'PRIVATE') return b.isPrivate;
    if (filter === 'JOINED') return b.isMember;
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '22px', color: '#ffd700', textShadow: '0 0 12px #ffd700', marginBottom: '12px', letterSpacing: '2px' }}>
          🎮 SECRET BOWLS
        </h1>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#8899aa', lineHeight: '2' }}>
          THEMED SECRET COMMUNITIES.
          POST IN A BOWL TO REACH A TARGETED AUDIENCE.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'TOTAL BOWLS', value: bowls.length, color: '#ffd700' },
          { label: 'PUBLIC', value: bowls.filter((b) => !b.isPrivate).length, color: '#44ff44' },
          { label: 'PRIVATE', value: bowls.filter((b) => b.isPrivate).length, color: '#b44fff' },
          { label: 'JOINED', value: bowls.filter((b) => b.isMember).length, color: '#00ffff' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'var(--bg-card)', padding: '16px', textAlign: 'center', boxShadow: `0 -2px 0 0 ${stat.color}44, 0 2px 0 0 ${stat.color}44, -2px 0 0 0 ${stat.color}44, 2px 0 0 0 ${stat.color}44` }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '18px', color: stat.color, textShadow: `0 0 6px ${stat.color}66`, marginBottom: '6px' }}>{stat.value}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {(['ALL', 'PUBLIC', 'PRIVATE', 'JOINED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '8px',
              padding: '8px 14px',
              cursor: 'pointer',
              border: 'none',
              background: filter === f ? '#ffd700' : 'transparent',
              color: filter === f ? '#000' : '#8899aa',
              boxShadow: filter === f
                ? '0 3px 0 0 #b8960c, 0 -2px 0 0 #ffd700, -2px 0 0 0 #ffd700, 2px 0 0 0 #ffd700'
                : '0 3px 0 0 #2a3555, 0 -2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555',
              transition: 'all 0.1s',
            }}
          >
            {f}
            {f === 'JOINED' && bowls.filter((b) => b.isMember).length > 0 && (
              <span style={{ background: '#00ffff', color: '#000', fontFamily: "'Press Start 2P', monospace", fontSize: '7px', padding: '1px 5px', marginLeft: '6px' }}>
                {bowls.filter((b) => b.isMember).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bowl grid */}
      {isLoading ? (
        <LoadingPixels />
      ) : filteredBowls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#8899aa' }}>
          👻 NO BOWLS FOUND
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filteredBowls.map((bowl, i) => (
            <div key={bowl.id} className="animate-pixel-in" style={{ animationDelay: `${i * 0.04}s` }}>
              <BowlCard bowl={bowl} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
