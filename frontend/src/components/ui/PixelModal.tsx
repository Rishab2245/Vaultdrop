'use client';

import { useEffect } from 'react';

interface PixelModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'gold' | 'cyan' | 'red';
}

export default function PixelModal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'gold',
}: PixelModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const borderColors = {
    gold: '#ffd700',
    cyan: '#00ffff',
    red: '#ff4444',
  };
  const color = borderColors[variant];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-pixel-in"
        style={{
          background: 'var(--bg-card)',
          boxShadow: `0 -4px 0 0 ${color}, 0 4px 0 0 ${color}, -4px 0 0 0 ${color}, 4px 0 0 0 ${color}`,
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#0d1220',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: `0 4px 0 0 ${color}`,
          }}
        >
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '11px',
              color,
              textShadow: `0 0 8px ${color}`,
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '12px',
              color: '#8899aa',
              padding: '4px 8px',
              transition: 'color 0.2s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
