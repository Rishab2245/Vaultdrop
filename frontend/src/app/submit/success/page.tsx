'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/hooks/useSession';

export default function SubmitSuccessPage() {
  const { session, initSession } = useSession();
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    initSession();
    setTimeout(() => setShowConfetti(true), 300);
  }, [initSession]);

  const handleCopy = async () => {
    if (session?.codename) {
      await navigator.clipboard.writeText(session.codename).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '60px 16px',
        textAlign: 'center',
      }}
    >
      {/* Animated icon */}
      <div
        style={{
          fontSize: '64px',
          marginBottom: '24px',
          display: 'block',
          animation: showConfetti ? 'pixelIn 0.5s ease-out' : 'none',
        }}
      >
        🔐
      </div>

      {/* Header */}
      <h1
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '18px',
          color: '#44ff44',
          textShadow: '0 0 12px #44ff44, 0 0 24px #44ff44',
          marginBottom: '8px',
          letterSpacing: '2px',
          animation: showConfetti ? 'coinDrop 0.6s ease-out' : 'none',
        }}
      >
        SECRET SUBMITTED
      </h1>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '10px',
          color: '#44ff44',
          marginBottom: '40px',
          animation: 'blink 2s step-end infinite',
        }}
      >
        ██████████████████ 100%
      </div>

      {/* Codename card */}
      <div
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 -4px 0 0 #00ffff, 0 4px 0 0 #00ffff, -4px 0 0 0 #00ffff, 4px 0 0 0 #00ffff',
          padding: '32px',
          marginBottom: '24px',
          animation: showConfetti ? 'pixelIn 0.4s ease-out 0.2s both' : 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '9px',
            color: '#8899aa',
            marginBottom: '16px',
          }}
        >
          👻 YOUR ANONYMOUS CODENAME
        </div>

        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '14px',
            color: '#00ffff',
            textShadow: '0 0 12px #00ffff',
            marginBottom: '20px',
            letterSpacing: '2px',
            wordBreak: 'break-all',
          }}
        >
          {session?.codename ?? 'LOADING...'}
        </div>

        <button
          onClick={handleCopy}
          className="pixel-btn pixel-btn-cyan pixel-btn-sm"
          style={{ margin: '0 auto' }}
        >
          {copied ? '✓ COPIED!' : '📋 COPY CODENAME'}
        </button>

        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            color: '#8899aa',
            marginTop: '16px',
            lineHeight: '2',
          }}
        >
          SAVE THIS CODENAME.
          <br />
          IT IDENTIFIES YOUR WINNINGS.
        </div>
      </div>

      {/* What happens next */}
      <div
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 -4px 0 0 #ffd700, 0 4px 0 0 #ffd700, -4px 0 0 0 #ffd700, 4px 0 0 0 #ffd700',
          padding: '28px',
          marginBottom: '32px',
          textAlign: 'left',
          animation: showConfetti ? 'pixelIn 0.4s ease-out 0.4s both' : 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '10px',
            color: '#ffd700',
            textShadow: '0 0 8px #ffd700',
            marginBottom: '20px',
          }}
        >
          🎮 WHAT HAPPENS NEXT?
        </div>

        {[
          {
            icon: '⚡',
            title: 'YOUR SECRET IS LIVE',
            desc: 'IT\'S NOW IN THE FEED COMPETING FOR VOTES.',
            color: '#ffd700',
          },
          {
            icon: '▲',
            title: 'GET VOTES',
            desc: 'THE COMMUNITY VOTES. MORE VOTES = HIGHER RANK SCORE.',
            color: '#00ffff',
          },
          {
            icon: '🏆',
            title: 'WIN THE POOL',
            desc: 'MIDNIGHT UTC — TOP RANKED SECRET WINS TODAY\'S PRIZE POOL.',
            color: '#44ff44',
          },
          {
            icon: '🪙',
            title: 'EARN',
            desc: 'WINNINGS CREDITED TO YOUR CODENAME. WITHDRAW ANYTIME.',
            color: '#ffd700',
          },
        ].map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              marginBottom: i < 3 ? '20px' : '0',
              paddingBottom: i < 3 ? '20px' : '0',
              boxShadow: i < 3 ? 'inset 0 -1px 0 0 #2a3555' : 'none',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                flexShrink: 0,
                width: '32px',
                textAlign: 'center',
              }}
            >
              {step.icon}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '9px',
                  color: step.color,
                  marginBottom: '6px',
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '7px',
                  color: '#8899aa',
                  lineHeight: '2',
                }}
              >
                {step.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/feed"
          className="pixel-btn pixel-btn-gold pixel-btn-lg"
          style={{ textDecoration: 'none' }}
        >
          📡 VIEW THE FEED
        </Link>
        <Link
          href="/vault"
          className="pixel-btn pixel-btn-cyan"
          style={{ textDecoration: 'none' }}
        >
          🏦 MY VAULT
        </Link>
      </div>
    </div>
  );
}
