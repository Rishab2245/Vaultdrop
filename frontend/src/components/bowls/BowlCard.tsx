import Link from 'next/link';
import { Bowl } from '@/types';

interface BowlCardProps {
  bowl: Bowl;
}

export default function BowlCard({ bowl }: BowlCardProps) {
  return (
    <Link href={`/bowls/${bowl.slug}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--bg-card)',
          boxShadow: bowl.isPrivate
            ? '0 -4px 0 0 #b44fff, 0 4px 0 0 #b44fff, -4px 0 0 0 #b44fff, 4px 0 0 0 #b44fff'
            : '0 -4px 0 0 #ffd700, 0 4px 0 0 #ffd700, -4px 0 0 0 #ffd700, 4px 0 0 0 #ffd700',
          padding: '24px',
          transition: 'background 0.2s',
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: '40px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{bowl.coverEmoji}</span>
          {bowl.isPrivate && (
            <span
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: '#b44fff',
                background: 'rgba(180,79,255,0.1)',
                padding: '4px 6px',
              }}
            >
              🔐 PRIVATE
            </span>
          )}
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '11px',
            color: '#e8e8e8',
            marginBottom: '10px',
            lineHeight: '1.6',
          }}
        >
          {bowl.name}
        </div>

        {/* Description */}
        {bowl.description && (
          <p
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '8px',
              color: '#8899aa',
              lineHeight: '2',
              marginBottom: '16px',
              flex: 1,
            }}
          >
            {bowl.description.length > 80 ? bowl.description.slice(0, 80) + '...' : bowl.description}
          </p>
        )}

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            paddingTop: '12px',
            boxShadow: 'inset 0 2px 0 0 #2a3555',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '12px',
                color: '#ffd700',
                textShadow: '0 0 6px #ffd70066',
              }}
            >
              {bowl.secretCount}
            </div>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: '#8899aa',
                marginTop: '4px',
              }}
            >
              SECRETS
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '12px',
                color: '#00ffff',
                textShadow: '0 0 6px #00ffff44',
              }}
            >
              {bowl.memberCount}
            </div>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: '#8899aa',
                marginTop: '4px',
              }}
            >
              MEMBERS
            </div>
          </div>

          {bowl.entryFee && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '12px',
                  color: '#44ff44',
                }}
              >
                ${bowl.entryFee}
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '7px',
                  color: '#8899aa',
                  marginTop: '4px',
                }}
              >
                ENTRY FEE
              </div>
            </div>
          )}

          {bowl.isMember && (
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: '#44ff44',
                textShadow: '0 0 6px #44ff44',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: 'auto',
              }}
            >
              ✓ MEMBER
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
