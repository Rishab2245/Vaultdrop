import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        background: '#0d1018',
        borderTop: '1px solid #1e2535',
        marginTop: '60px',
        padding: '40px 24px 28px',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '36px',
            marginBottom: '36px',
          }}
        >
          {/* Brand */}
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px', color: '#c9a227', marginBottom: '14px' }}>
              VAULTDROP
            </div>
            <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3a4558', lineHeight: '2.2' }}>
              Anonymous secrets.<br />
              Real prizes.<br />
              Post your truth.
            </p>
          </div>

          {/* Explore */}
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#6a7a8e', marginBottom: '14px', letterSpacing: '2px' }}>
              EXPLORE
            </div>
            {[
              { href: '/feed', label: 'FEED' },
              { href: '/leaderboard', label: 'LEADERBOARD' },
              { href: '/hall-of-fame', label: 'HALL OF FAME' },
              { href: '/bowls', label: 'BOWLS' },
            ].map((link) => (
              <Link key={link.href} href={link.href} style={{ display: 'block', fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3a4558', textDecoration: 'none', marginBottom: '9px', transition: 'color 0.15s' }}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Participate */}
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#6a7a8e', marginBottom: '14px', letterSpacing: '2px' }}>
              PARTICIPATE
            </div>
            {[
              { href: '/submit', label: 'POST A SECRET' },
              { href: '/vault', label: 'MY VAULT' },
              { href: '/how-it-works', label: 'HOW IT WORKS' },
            ].map((link) => (
              <Link key={link.href} href={link.href} style={{ display: 'block', fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3a4558', textDecoration: 'none', marginBottom: '9px' }}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Status */}
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#6a7a8e', marginBottom: '14px', letterSpacing: '2px' }}>
              STATUS
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3d7a54', display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#3d7a54', animation: 'blink 2s step-end infinite' }} />
              ONLINE
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3a4558', lineHeight: '2.2' }}>
              ALL ANONYMOUS.<br />
              NO LOGS KEPT.
            </div>
          </div>
        </div>

        <div className="pixel-divider" style={{ marginBottom: '20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: '#2a3345' }}>
            © 2025 VAULTDROP. USE RESPONSIBLY.
          </div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', color: '#2a3345' }}>
            V0.1.0 BETA
          </div>
        </div>
      </div>
    </footer>
  );
}
