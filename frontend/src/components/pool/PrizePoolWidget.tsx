'use client';

import { usePrizePool } from '@/lib/hooks/usePrizePool';
import { DailyPool } from '@/types';
import CountdownTimer from '@/components/ui/CountdownTimer';
import CoinAmount from '@/components/ui/CoinAmount';
import Link from 'next/link';

interface PrizePoolWidgetProps {
  initialPool?: DailyPool | null;
}

export default function PrizePoolWidget({ initialPool }: PrizePoolWidgetProps) {
  const { poolTotal, entryCount, timeUntilDraw } = usePrizePool(initialPool);

  const maxPool = Math.max(poolTotal, 100);
  const progressPct = Math.min(100, (poolTotal / maxPool) * 100);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        boxShadow: '0 -1px 0 0 var(--border-mid), 0 1px 0 0 var(--border-mid), -1px 0 0 0 var(--border-mid), 1px 0 0 0 var(--border-mid)',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '8px',
          color: 'var(--text-secondary)',
          marginBottom: '16px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}
      >
        DAILY POOL
      </div>

      {/* Prize amount */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }} className="animate-coin-drop">
        <CoinAmount amount={poolTotal} size="xl" glow />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '14px' }}>
        <div className="pixel-progress">
          <div className="pixel-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)' }}>GROWTH</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--amber)' }}>{Math.round(progressPct)}%</span>
        </div>
      </div>

      {/* Entry count */}
      <div style={{ textAlign: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        <span style={{ color: 'var(--text-primary)' }}>{entryCount}</span> secrets competing
      </div>

      <div className="pixel-divider" style={{ marginBottom: '16px' }} />

      <CountdownTimer initialMs={timeUntilDraw} label="DRAW IN" size="sm" />

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <Link href="/submit" className="pixel-btn pixel-btn-gold pixel-btn-sm" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          ENTER NOW
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <Link href="/how-it-works" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: 'var(--text-dim)', textDecoration: 'none' }}>
          how does this work?
        </Link>
      </div>
    </div>
  );
}
