'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './Brand';

const NAV = [
  { href: '/wall', label: 'The Wall' },
  { href: '/drop', label: 'Send a drop' },
  { href: '/inbox', label: 'My inbox' },
  { href: '/vault', label: 'My vault' },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-ink-800 text-chalk'
                    : 'text-chalk-dim hover:bg-ink-850/70 hover:text-chalk'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/confess" className="btn-primary hidden sm:inline-flex">
          Confess
        </Link>

        {/* Mobile: the nav collapses to the two things people actually came for. */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link href="/wall" className="btn-ghost px-4 py-2 text-xs">
            Wall
          </Link>
          <Link href="/confess" className="btn-primary px-4 py-2 text-xs">
            Confess
          </Link>
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-t border-ink-800/60 px-4 py-2 md:hidden"
        aria-label="Sections"
      >
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${
                active ? 'bg-ink-800 text-chalk' : 'text-chalk-faint hover:text-chalk-dim'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
