'use client';

import { useState, useEffect } from 'react';
import { getMsUntilMidnightUTC, formatCountdown } from '@/lib/utils/formatters';

interface CountdownTimerProps {
  initialMs?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CountdownTimer({
  initialMs,
  label = 'DRAWING IN',
  size = 'md',
}: CountdownTimerProps) {
  const [msLeft, setMsLeft] = useState(initialMs ?? getMsUntilMidnightUTC());
  const [colonVisible, setColonVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsLeft((prev) => {
        const next = prev - 1000;
        return next <= 0 ? getMsUntilMidnightUTC() : next;
      });
      setColonVisible((v) => !v);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { hours, minutes, seconds } = formatCountdown(msLeft);

  const digitSize = size === 'sm' ? '14px' : size === 'lg' ? '28px' : '20px';
  const labelSize = size === 'sm' ? '7px' : '8px';
  const colonSize = size === 'sm' ? '18px' : size === 'lg' ? '32px' : '24px';

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: labelSize,
          color: '#8899aa',
          marginBottom: '8px',
          letterSpacing: '2px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        {/* Hours */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {hours.split('').map((d, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: digitSize,
                color: '#ffd700',
                textShadow: '0 0 8px #ffd700',
                background: '#0d1220',
                padding: '6px 8px',
                minWidth: size === 'lg' ? '36px' : '28px',
                textAlign: 'center',
                boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555',
                display: 'inline-block',
              }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Colon */}
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: colonSize,
            color: '#ffd700',
            opacity: colonVisible ? 1 : 0,
            transition: 'opacity 0.1s',
            marginBottom: '4px',
          }}
        >
          :
        </span>

        {/* Minutes */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {minutes.split('').map((d, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: digitSize,
                color: '#ffd700',
                textShadow: '0 0 8px #ffd700',
                background: '#0d1220',
                padding: '6px 8px',
                minWidth: size === 'lg' ? '36px' : '28px',
                textAlign: 'center',
                boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555',
                display: 'inline-block',
              }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Colon */}
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: colonSize,
            color: '#ffd700',
            opacity: colonVisible ? 1 : 0,
            transition: 'opacity 0.1s',
            marginBottom: '4px',
          }}
        >
          :
        </span>

        {/* Seconds */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {seconds.split('').map((d, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: digitSize,
                color: '#00ffff',
                textShadow: '0 0 8px #00ffff',
                background: '#0d1220',
                padding: '6px 8px',
                minWidth: size === 'lg' ? '36px' : '28px',
                textAlign: 'center',
                boxShadow: '0 -2px 0 0 #2a3555, 0 2px 0 0 #2a3555, -2px 0 0 0 #2a3555, 2px 0 0 0 #2a3555',
                display: 'inline-block',
              }}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
