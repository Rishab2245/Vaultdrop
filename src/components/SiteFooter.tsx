import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-800/80">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-sm text-sm leading-relaxed text-chalk-faint">
            No accounts. No email. No IP logs. Private drops and inbox messages are encrypted in
            your browser, so there is nothing on our side to hand over.
          </p>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
            <Link href="/how-it-works" className="text-chalk-dim transition-colors hover:text-chalk">
              How it works
            </Link>
            <Link href="/privacy" className="text-chalk-dim transition-colors hover:text-chalk">
              What we store
            </Link>
            <a
              href="https://github.com/Rishab2245/Vaultdrop"
              target="_blank"
              rel="noreferrer noopener"
              className="text-chalk-dim transition-colors hover:text-chalk"
            >
              Source
            </a>
          </nav>
        </div>

        <p className="mt-8 text-xs text-chalk-faint/70">
          Be careful what you post. Anything on the Wall is public and permanent to whoever
          screenshots it first.
        </p>
      </div>
    </footer>
  );
}
