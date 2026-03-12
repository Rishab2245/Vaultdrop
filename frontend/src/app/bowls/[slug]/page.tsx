'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Bowl, Secret, FeedFilters as FiltersType } from '@/types';
import SecretCard from '@/components/feed/SecretCard';
import FeedFilters from '@/components/feed/FeedFilters';
import LoadingPixels from '@/components/ui/LoadingPixels';
import { fetchGraphQL } from '@/lib/api';
import { GET_BOWL_BY_SLUG, GET_SECRETS_FEED } from '@/lib/queries';
import { JOIN_BOWL } from '@/lib/mutations';
import { useSessionStore } from '@/lib/hooks/useSession';

const SORT_MAP: Record<string, string> = { HOT: 'rank', NEW: 'new', TOP: 'votes' };

export default function BowlDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { session } = useSessionStore();

  const [bowl, setBowl] = useState<Bowl | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [filters, setFilters] = useState<FiltersType>({ sort: 'HOT', category: 'ALL' });
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchGraphQL<{ bowl: Bowl }>(GET_BOWL_BY_SLUG, { slug }),
      fetchGraphQL<{ feed: { items: Secret[] } }>(
        GET_SECRETS_FEED,
        { bowlSlug: slug, limit: 20, sort: SORT_MAP[filters.sort ?? 'HOT'] ?? 'rank' }
      ),
    ])
      .then(([bowlData, feedData]) => {
        if (!bowlData.bowl) {
          setLoadError('Bowl not found.');
          return;
        }
        setBowl(bowlData.bowl);
        setIsMember(bowlData.bowl.isMember);
        setSecrets(feedData.feed.items);
      })
      .catch((err) => {
        console.error('Bowl load error:', err);
        setLoadError('Failed to load bowl.');
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, filters.sort]);

  const handleJoin = async () => {
    if (!bowl || isJoining) return;
    setIsJoining(true);
    try {
      await fetchGraphQL(JOIN_BOWL, { bowlId: bowl.id }, session?.id);
      setIsMember(true);
      setBowl((prev) => prev ? { ...prev, memberCount: prev.memberCount + 1, isMember: true } : prev);
    } catch (err) {
      console.error('Join error:', err);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) return <LoadingPixels label="LOADING BOWL..." />;

  if (loadError || !bowl) return (
    <div style={{ textAlign: 'center', padding: '64px', fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#ff4444', lineHeight: 2 }}>
      💀 {loadError ?? 'BOWL NOT FOUND'}
      <br /><br />
      <Link href="/bowls" className="pixel-btn pixel-btn-gold" style={{ textDecoration: 'none' }}>← BACK TO BOWLS</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Breadcrumb */}
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#8899aa', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/bowls" style={{ color: '#ffd700', textDecoration: 'none' }}>BOWLS</Link>
        <span>›</span>
        <span>{bowl.coverEmoji} {bowl.name}</span>
      </div>

      {/* Bowl header */}
      <div style={{ background: 'var(--bg-card)', boxShadow: bowl.isPrivate ? '0 -4px 0 0 #b44fff, 0 4px 0 0 #b44fff, -4px 0 0 0 #b44fff, 4px 0 0 0 #b44fff' : '0 -4px 0 0 #ffd700, 0 4px 0 0 #ffd700, -4px 0 0 0 #ffd700, 4px 0 0 0 #ffd700', padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '48px', flexShrink: 0 }}>{bowl.coverEmoji}</div>
            <div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '18px', color: '#e8e8e8', margin: 0 }}>{bowl.name}</h1>
                {bowl.isPrivate && <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#b44fff', background: 'rgba(180,79,255,0.1)', padding: '4px 8px' }}>🔐 PRIVATE</span>}
                {isMember && <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#44ff44', background: 'rgba(68,255,68,0.1)', padding: '4px 8px' }}>✓ MEMBER</span>}
              </div>
              {bowl.description && (
                <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#8899aa', lineHeight: '2', maxWidth: '480px', margin: 0 }}>
                  {bowl.description}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              {[
                { label: 'SECRETS', value: bowl.secretCount, color: '#ffd700' },
                { label: 'MEMBERS', value: bowl.memberCount, color: '#00ffff' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '16px', color: stat.color, textShadow: `0 0 6px ${stat.color}66` }}>{stat.value}</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa', marginTop: '4px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
            {!isMember && (
              <button onClick={handleJoin} disabled={isJoining} className="pixel-btn pixel-btn-cyan">
                {isJoining ? '...' : `⚡ JOIN${bowl.entryFee ? ` ($${bowl.entryFee})` : ' FREE'}`}
              </button>
            )}
            <Link href={`/submit?bowl=${bowl.slug}`} className="pixel-btn pixel-btn-gold" style={{ textDecoration: 'none' }}>
              🔐 POST HERE
            </Link>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '28px' }}>
        <div>
          <FeedFilters filters={filters} onChange={setFilters} totalCount={secrets.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {secrets.map((secret) => (
              <SecretCard key={secret.id} secret={secret} />
            ))}
            {secrets.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px', fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#8899aa', boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555' }}>
                👻 NO SECRETS IN THIS BOWL YET.
                <br /><br />
                <Link href={`/submit?bowl=${bowl.slug}`} className="pixel-btn pixel-btn-gold pixel-btn-sm" style={{ textDecoration: 'none' }}>
                  POST THE FIRST
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div style={{ background: 'var(--bg-card)', boxShadow: '0 -4px 0 0 #2a3555, 0 4px 0 0 #2a3555, -4px 0 0 0 #2a3555, 4px 0 0 0 #2a3555', padding: '20px' }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#ffd700', marginBottom: '16px' }}>🎮 BOWL INFO</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa', lineHeight: '2.4' }}>
              <div style={{ marginBottom: '8px' }}>TYPE: <span style={{ color: bowl.isPrivate ? '#b44fff' : '#44ff44' }}>{bowl.isPrivate ? 'PRIVATE' : 'PUBLIC'}</span></div>
              {bowl.entryFee && <div style={{ marginBottom: '8px' }}>ENTRY FEE: <span style={{ color: '#ffd700' }}>${bowl.entryFee}</span></div>}
              <div>SLUG: <span style={{ color: '#00ffff' }}>{bowl.slug}</span></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          div[style*="grid-template-columns: 1fr 280px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
