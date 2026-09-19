'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './Brand';
import { useGhost } from '@/lib/use-ghost';

const NAV = [
  { href: '/wall', label: 'Wall', key: 'F1', glyph: '▤' },
  { href: '/confess', label: 'Confess', key: 'F2', glyph: '✎' },
  { href: '/threads', label: 'Threads', key: 'F3', glyph: '◈' },
  { href: '/leaderboard', label: 'Standing', key: 'F4', glyph: '▲' },
  { href: '/drop', label: 'Drop', key: 'F5', glyph: '◆' },
  { href: '/inbox', label: 'Inbox', key: 'F6', glyph: '▼' },
];

/**
 * Navigation.
 *
 * On a phone this used to be a horizontally scrolling row, which put half the
 * destinations off-screen with no affordance saying so - Standing, Drop and
 * Inbox were unreachable on the device this product actually lives on.
 *
 * So there are two: the keyboard-style row on wide screens, and a fixed bottom
 * bar on narrow ones where every destination is visible at once and sits under
 * a thumb. Hidden by CSS rather than unmounted, so resizing does not remount.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { identity, keys } = useGhost();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-void">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-2.5">
          <Wordmark />

          {/* Wide screens: the full labelled row. */}
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`whitespace-nowrap px-2 py-1 text-2xs uppercase tracking-[0.12em] no-underline ${
                  isActive(item.href) ? 'text-amber' : 'text-label hover:text-chrome'
                }`}
              >
                <span className="text-label/60">{item.key}:</span> {item.label}
              </Link>
            ))}
          </nav>

          {/* Narrow screens: the balance, since the bottom bar has no room. */}
          {keys !== null && (
            <Link href="/ghost" className="tabular text-2xs text-amber no-underline md:hidden">
              {keys} KEYS
            </Link>
          )}
        </div>

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
                <Link href="/ghost" className="hidden tabular text-amber no-underline md:inline">
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

      {/* Narrow screens: a fixed bar where nothing is off-screen. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-hairline bg-void md:hidden"
        aria-label="Main"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 px-1 py-2 no-underline ${
              isActive(item.href) ? 'text-amber' : 'text-label'
            }`}
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {item.glyph}
            </span>
            <span className="text-[9px] uppercase tracking-[0.06em]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
