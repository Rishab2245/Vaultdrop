'use client';

import Link from 'next/link';
import { clsx } from 'clsx';

interface PixelButtonProps {
  variant?: 'gold' | 'cyan' | 'ghost' | 'red';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit';
}

export default function PixelButton({
  variant = 'gold',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  href,
  children,
  className = '',
  type = 'button',
}: PixelButtonProps) {
  const classes = clsx(
    'pixel-btn',
    `pixel-btn-${variant}`,
    size === 'sm' && 'pixel-btn-sm',
    size === 'lg' && 'pixel-btn-lg',
    className
  );

  const content = loading ? (
    <>
      <span
        style={{
          display: 'inline-flex',
          gap: '3px',
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '6px',
              height: '6px',
              background: 'currentColor',
              display: 'inline-block',
              animation: `blink 0.8s step-end ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </span>
      LOADING...
    </>
  ) : (
    children
  );

  if (href) {
    return (
      <Link href={href} className={classes} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {content}
    </button>
  );
}
