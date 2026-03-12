'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/hooks/useSession';

const NAV_LINKS = [
  { href: '/feed', label: 'FEED' },
  { href: '/leaderboard', label: 'BOARD' },
  { href: '/bowls', label: 'BOWLS' },
  { href: '/hall-of-fame', label: 'HALL OF FAME' },
  { href: '/how-it-works', label: 'HOW IT WORKS' },
];

export default function NavBar() {
  const pathname = usePathname();
  const { session, initSession } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    initSession();
  }, [initSession]);

  return (
    <nav
      style={{
        background: '#0d1018',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '2px solid #1e2535',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '58px',
        }}
      >
        {/* Logo */}
        <Link
          href="/feed"
          style={{
            textDecoration: 'none',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '14px',
            color: '#c9a227',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            letterSpacing: '1px',
          }}
        >
          VAULTDROP
        </Link>

        {/* Desktop Nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            flex: 1,
            justifyContent: 'center',
          }}
          className="desktop-nav"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: pathname === link.href ? '#c9a227' : '#6a7a8e',
                textDecoration: 'none',
                padding: '8px 10px',
                borderBottom: pathname === link.href ? '2px solid #c9a227' : '2px solid transparent',
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {session && (
            <Link
              href="/vault"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: '#4a7fa5',
                textDecoration: 'none',
                padding: '6px 10px',
                background: '#111520',
                border: '1px solid #1e2535',
                display: 'none',
              }}
              className="codename-display"
            >
              {session.codename.length > 14 ? session.codename.slice(0, 14) + '…' : session.codename}
            </Link>
          )}

          <Link
            href="/submit"
            className="pixel-btn pixel-btn-gold pixel-btn-sm"
            style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            POST SECRET
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6a7a8e',
              fontSize: '16px',
              padding: '8px',
              display: 'none',
              fontFamily: "'Press Start 2P', monospace",
            }}
            className="hamburger-btn"
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          style={{
            background: '#0d1018',
            borderTop: '1px solid #1e2535',
            padding: '12px 20px',
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '9px',
                color: pathname === link.href ? '#c9a227' : '#6a7a8e',
                textDecoration: 'none',
                padding: '12px 6px',
                borderBottom: '1px solid #1e2535',
              }}
            >
              {link.label}
            </Link>
          ))}
          {session && (
            <Link
              href="/vault"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#4a7fa5',
                textDecoration: 'none',
                padding: '12px 6px',
                marginTop: '4px',
              }}
            >
              MY VAULT: {session.codename}
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: block !important; }
        }
        @media (min-width: 901px) {
          .mobile-menu { display: none !important; }
          .codename-display { display: block !important; }
        }
        @media (max-width: 600px) {
          .codename-display { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
