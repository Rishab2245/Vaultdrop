import Link from 'next/link';

/** The mark: a keyhole cut out of a solid block. Reads at 16px, which matters. */
export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vd-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A08CFF" />
          <stop offset="100%" stopColor="#4B2FD6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#vd-mark)" />
      <path
        d="M16 9.5a4 4 0 0 0-2.2 7.34L12.4 23h7.2l-1.4-6.16A4 4 0 0 0 16 9.5Z"
        fill="#07060B"
      />
    </svg>
  );
}

export function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="VaultDrop home">
      <Mark className="h-7 w-7 transition-transform duration-300 group-hover:scale-105" />
      <span className="text-[15px] font-semibold tracking-tight text-chalk">
        Vault<span className="text-chalk-dim">Drop</span>
      </span>
    </Link>
  );
}
