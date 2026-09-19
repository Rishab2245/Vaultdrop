import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hairline">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="statusbar mb-4">
          <span>END OF TRANSMISSION</span>
          <span className="hidden sm:inline">NO ACCOUNTS · NO EMAIL · NO IP LOG</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-sm text-sm leading-relaxed text-label">
            Private drops and inbox messages are encrypted in your browser. What reaches this
            system is ciphertext it holds no key for.
          </p>

          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-2xs uppercase tracking-[0.1em]">
            <Link href="/how-it-works" className="text-label no-underline hover:text-amber">
              How it works
            </Link>
            <Link href="/privacy" className="text-label no-underline hover:text-amber">
              What we store
            </Link>
            <Link href="/suggest" className="text-label no-underline hover:text-amber">
              Suggestions
            </Link>
            <a
              href="https://github.com/Rishab2245/Vaultdrop"
              target="_blank"
              rel="noreferrer noopener"
              className="text-label no-underline hover:text-amber"
            >
              Source
            </a>
          </nav>
        </div>

        <p className="mt-5 text-2xs uppercase tracking-[0.1em] text-label/70">
          The Wall is public. Anything posted there is permanent to whoever screenshots it first.
        </p>
      </div>
    </footer>
  );
}
