'use client';

export default function ScanlineOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9998,
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.025) 3px,
            rgba(0, 0, 0, 0.025) 4px
          )
        `,
      }}
    />
  );
}
