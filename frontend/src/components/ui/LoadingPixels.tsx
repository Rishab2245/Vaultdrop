'use client';

interface LoadingPixelsProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingPixels({ label = 'LOADING...', size = 'md' }: LoadingPixelsProps) {
  const pixelSize = size === 'sm' ? 10 : size === 'lg' ? 20 : 14;
  const gap = size === 'sm' ? 4 : 6;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '32px',
      }}
    >
      <div style={{ display: 'flex', gap: `${gap}px`, alignItems: 'center' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: `${pixelSize}px`,
              height: `${pixelSize}px`,
              background: i % 2 === 0 ? '#ffd700' : '#00ffff',
              boxShadow: i % 2 === 0 ? '0 0 8px #ffd700' : '0 0 8px #00ffff',
              animation: `blink 0.6s step-end ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      {label && (
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: size === 'sm' ? '8px' : '10px',
            color: '#8899aa',
            animation: 'blink 1.2s step-end infinite',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
