'use client';

import { clsx } from 'clsx';

interface PixelCardProps {
  variant?: 'default' | 'gold' | 'cyan' | 'ghost' | 'red' | 'green';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  style?: React.CSSProperties;
}

export default function PixelCard({
  variant = 'default',
  children,
  className = '',
  onClick,
  hover = false,
  style,
}: PixelCardProps) {
  const borderClasses = {
    default: 'pixel-border',
    gold: 'pixel-border',
    cyan: 'pixel-border-cyan',
    ghost: 'pixel-border-muted',
    red: 'pixel-border-red',
    green: 'pixel-border-green',
  };

  return (
    <div
      className={clsx(
        borderClasses[variant],
        hover && 'pixel-card-hover',
        className
      )}
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        padding: '20px',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.2s',
        ...(hover && { ['--hover-bg' as string]: 'var(--bg-card-hover)' }),
        ...style,
      }}
    >
      {children}

      {hover && (
        <style>{`
          div:hover {
            background: var(--bg-card-hover) !important;
          }
        `}</style>
      )}
    </div>
  );
}
