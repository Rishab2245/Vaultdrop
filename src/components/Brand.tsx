import Link from 'next/link';

/**
 * The mark is a redaction bar with one character still showing through.
 *
 * It is the product in one glyph: something is written here, and you are not
 * going to read it.
 */
export function Mark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="1" y="6" width="22" height="12" fill="#E8ECF4" />
      <rect x="4" y="9" width="3" height="6" fill="#0A0E1A" />
      <rect x="9" y="9" width="2" height="6" fill="#0A0E1A" />
      <rect x="13" y="9" width="4" height="6" fill="#0A0E1A" />
      <rect x="19" y="9" width="1.5" height="6" fill="#FFA02F" />
    </svg>
  );
}

export function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 no-underline"
      aria-label="VaultDrop home"
    >
      <Mark />
      <span className="text-sm uppercase tracking-[0.18em] text-chrome">
        Vault<span className="text-label group-hover:text-amber">drop</span>
      </span>
    </Link>
  );
}
