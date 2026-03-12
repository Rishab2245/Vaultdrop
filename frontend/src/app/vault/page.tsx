'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnonSession, Secret } from '@/types';
import LoadingPixels from '@/components/ui/LoadingPixels';
import CoinAmount from '@/components/ui/CoinAmount';
import PixelBadge from '@/components/ui/PixelBadge';
import { useSession } from '@/lib/hooks/useSession';
import { fetchGraphQL } from '@/lib/api';
import { GET_MY_VAULT } from '@/lib/queries';
import { formatTimeAgo, getStatusLabel, getStatusColor, formatCurrency } from '@/lib/utils/formatters';

interface VaultStats {
  totalSecrets: number;
  totalEarnings: number;
  totalVotes: number;
  totalViews: number;
}

export default function VaultPage() {
  const { session, initSession, isLoading: sessionLoading } = useSession();
  const [vaultSecrets, setVaultSecrets] = useState<Secret[]>([]);
  const [stats, setStats] = useState<VaultStats>({ totalSecrets: 0, totalEarnings: 0, totalVotes: 0, totalViews: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (!session) return;

    fetchGraphQL<{
      me: AnonSession;
      mySecrets: { items: Secret[]; total: number };
    }>(GET_MY_VAULT, undefined, session.id)
      .then((data) => {
        const items = data.mySecrets.items;
        setVaultSecrets(items);
        setStats({
          totalSecrets: data.mySecrets.total,
          totalEarnings: data.me.earnings,
          totalVotes: items.reduce((s, x) => s + x.voteCount, 0),
          totalViews: items.reduce((s, x) => s + x.peekCount, 0),
        });
      })
      .catch((err) => {
        console.error('Vault load error:', err);
        setVaultSecrets([]);
      })
      .finally(() => setIsLoading(false));
  }, [session]);

  const handleCopyCodename = async () => {
    if (session?.codename) {
      await navigator.clipboard.writeText(session.codename).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (sessionLoading || (!session && isLoading)) return <LoadingPixels label="LOADING VAULT..." />;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '22px', color: '#ffd700', textShadow: '0 0 12px #ffd700', marginBottom: '8px', letterSpacing: '2px' }}>
          🏦 YOUR VAULT
        </h1>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#8899aa' }}>
          ANONYMOUS DASHBOARD
        </div>
      </div>

      {/* Codename card */}
      <div style={{ background: 'var(--bg-card)', boxShadow: '0 -4px 0 0 #00ffff, 0 4px 0 0 #00ffff, -4px 0 0 0 #00ffff, 4px 0 0 0 #00ffff', padding: '28px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#8899aa', marginBottom: '10px' }}>👻 YOUR CODENAME</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '18px', color: '#00ffff', textShadow: '0 0 12px #00ffff', letterSpacing: '2px', wordBreak: 'break-all' }}>
            {session?.codename ?? 'ANONYMOUS'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleCopyCodename} className="pixel-btn pixel-btn-cyan pixel-btn-sm">
            {copied ? '✓ COPIED' : '📋 COPY'}
          </button>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#8899aa' }}>
            CREDIBILITY: <span style={{ color: '#ffd700' }}>{session?.credibilityScore ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'SECRETS POSTED', value: stats.totalSecrets, color: '#ffd700', icon: '🔐' },
          { label: 'TOTAL EARNINGS', value: <CoinAmount amount={stats.totalEarnings} size="md" glow />, color: '#44ff44', icon: '🪙' },
          { label: 'TOTAL VOTES', value: stats.totalVotes, color: '#00ffff', icon: '▲' },
          { label: 'TOTAL VIEWS', value: stats.totalViews, color: '#b44fff', icon: '👁️' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', boxShadow: `0 -4px 0 0 ${stat.color}44, 0 4px 0 0 ${stat.color}44, -4px 0 0 0 ${stat.color}44, 4px 0 0 0 ${stat.color}44`, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>{stat.icon}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: typeof stat.value === 'number' ? '20px' : '12px', color: stat.color, textShadow: `0 0 6px ${stat.color}66`, marginBottom: '8px' }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#8899aa' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Secrets table */}
      <div style={{ background: 'var(--bg-card)', boxShadow: '0 -4px 0 0 #ffd700, 0 4px 0 0 #ffd700, -4px 0 0 0 #ffd700, 4px 0 0 0 #ffd700', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '11px', color: '#ffd700', textShadow: '0 0 8px #ffd700' }}>
            🔐 MY SECRETS
          </div>
          <Link href="/submit" className="pixel-btn pixel-btn-gold pixel-btn-sm" style={{ textDecoration: 'none' }}>
            + POST NEW
          </Link>
        </div>

        {isLoading ? (
          <LoadingPixels size="sm" />
        ) : vaultSecrets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#8899aa' }}>
            👻 NO SECRETS YET.
            <br /><br />
            <Link href="/submit" className="pixel-btn pixel-btn-gold pixel-btn-sm" style={{ textDecoration: 'none' }}>
              POST YOUR FIRST SECRET
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pixel-table" style={{ minWidth: '600px' }}>
              <thead>
                <tr>
                  <th>CATEGORY</th>
                  <th>PREVIEW</th>
                  <th>STATUS</th>
                  <th>VOTES</th>
                  <th>PEEKED</th>
                  <th>EARNINGS</th>
                  <th>POSTED</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vaultSecrets.map((secret) => {
                  const ghostEarnings = secret.isGhost
                    ? (secret.peekCount ?? 0) * (secret.peekPrice ?? 0) * 0.7
                    : 0;
                  const earnings = ghostEarnings;

                  return (
                    <tr key={secret.id}>
                      <td><PixelBadge category={secret.category} size="sm" /></td>
                      <td>
                        <span style={{ color: secret.isGhost ? '#00ffff' : '#e8e8e8' }}>
                          {secret.isGhost
                            ? `👻 ${(secret.hintText ?? '').slice(0, 30)}...`
                            : (secret.content ?? '').slice(0, 35) + '...'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: getStatusColor(secret.status), textShadow: secret.status === 'WINNER' ? '0 0 6px #ffd700' : 'none' }}>
                          {getStatusLabel(secret.status)}
                        </span>
                      </td>
                      <td style={{ color: '#ffd700', textAlign: 'center' }}>▲ {secret.voteCount}</td>
                      <td style={{ color: '#00ffff', textAlign: 'center' }}>
                        {secret.isGhost ? `👁️ ${secret.peekCount}` : '—'}
                      </td>
                      <td>
                        {earnings > 0 ? (
                          <span style={{ color: '#44ff44', textShadow: '0 0 6px #44ff4466', fontFamily: "'Press Start 2P', monospace", fontSize: '9px' }}>
                            🪙 {formatCurrency(earnings)}
                          </span>
                        ) : (
                          <span style={{ color: '#8899aa', fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: '#8899aa', fontSize: '8px' }}>{formatTimeAgo(secret.createdAt)}</td>
                      <td>
                        <Link href={`/secret/${secret.id}`} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#ffd700', textDecoration: 'none' }}>
                          VIEW →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Earnings */}
      {stats.totalEarnings > 0 && (
        <div style={{ background: 'var(--bg-card)', boxShadow: '0 -4px 0 0 #44ff44, 0 4px 0 0 #44ff44, -4px 0 0 0 #44ff44, 4px 0 0 0 #44ff44', padding: '24px' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '11px', color: '#44ff44', textShadow: '0 0 8px #44ff44', marginBottom: '20px' }}>
            🪙 EARNINGS
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#8899aa', marginBottom: '8px' }}>TOTAL EARNED</div>
              <CoinAmount amount={stats.totalEarnings} size="lg" glow />
            </div>
            <button disabled className="pixel-btn pixel-btn-ghost pixel-btn-sm" title="Withdrawal coming soon">
              💸 WITHDRAW (COMING SOON)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
