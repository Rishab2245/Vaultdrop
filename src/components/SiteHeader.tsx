'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './Brand';
import { useGhost } from '@/lib/use-ghost';

const NAV = [
  { href: '/wall', label: 'Wall', key: 'F1' },
  { href: '/confess', label: 'Confess', key: 'F2' },
  { href: '/threads', label: 'Threads', key: 'F3' },
  { href: '/leaderboard', label: 'Standing', key: 'F4' },
  { href: '/drop', label: 'Drop', key: 'F5' },
  { href: '/inbox', label: 'Inbox', key: 'F6' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { identity, keys } = useGhost();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-void">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-2.5">
        <Wordmark />

        <nav className="flex items-center gap-0.5 overflow-x-auto" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap px-2 py-1 text-2xs uppercase tracking-[0.12em] no-underline ${
                  active ? 'text-amber' : 'text-label hover:text-chrome'
                }`}
              >
                <span className="hidden text-label/60 sm:inline">{item.key}:</span> {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* The system's standing declaration, plus the ghost's balance once there
          is one. A visitor who has never claimed an identity sees no account
          furniture at all, which is the point. */}
      <div className="mx-auto max-w-4xl px-4 pb-2">
        <div className="statusbar">
          <span className="truncate">
            {identity ? (
              <Link href="/ghost" className="text-label no-underline hover:text-amber">
                {identity.codename}
              </Link>
            ) : (
              'VAULTDROP // ANONYMOUS RECORD SYSTEM'
            )}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {keys !== null && (
              <Link href="/ghost" className="tabular text-amber no-underline">
                {keys} KEYS
              </Link>
            )}
            <span className="hidden sm:inline">
              <span className="text-sealed">AES-256-GCM</span> · KEY NOT HELD
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
