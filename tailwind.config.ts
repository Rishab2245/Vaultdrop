import type { Config } from 'tailwindcss';

/**
 * VaultDrop — "declassified terminal".
 *
 * Two directions merged: the Bloomberg-terminal record system, and the
 * redaction bar of a document that has been officially withheld.
 *
 * The rule that holds them together: the SYSTEM speaks in monospace, the
 * HUMAN speaks in serif, and the redaction bar marks every place the system
 * cannot read what the human wrote. The bar is not decoration - it renders
 * exactly the fields we hold no key for.
 *
 * Deliberately single-theme. A terminal in light mode is not a terminal, so
 * every colour below is painted explicitly and nothing inherits a host ground.
 */

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ground and elevation. Elevation is carried by hairlines, never shadow.
        void: '#0A0E1A',
        panel: '#11172A',
        raised: '#1A2138',
        hairline: '#2A3050',

        // Signal. Amber is the system's voice and stays under ~5% of pixels.
        amber: '#FFA02F',
        sealed: '#00B96B',
        alert: '#F23645',

        // Text. Chrome is also the redaction bar - covering text with the
        // foreground colour is what redaction physically is.
        chrome: '#E8ECF4',
        body: '#9AA3BD',
        label: '#5E6680',

        // Classification channels, chosen from terminal phosphor colours.
        channel: {
          amber: '#FFA02F',
          green: '#00B96B',
          red: '#F23645',
          cyan: '#2FD5E8',
          violet: '#9B7BFF',
          chrome: '#E8ECF4',
        },
      },
      fontFamily: {
        // Inline fallbacks: a bare var() that never resolves invalidates the
        // whole declaration and silently drops the page to serif.
        mono: ['var(--font-mono, ui-monospace)', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['var(--font-serif, ui-serif)', 'Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        // Terminal sizes: dense, no 16px body, no 32px marketing headline.
        '2xs': ['10px', { lineHeight: '1.4' }],
        xs: ['11px', { lineHeight: '1.45' }],
        sm: ['12px', { lineHeight: '1.5' }],
        base: ['13px', { lineHeight: '1.55' }],
        // The human register. Only confession bodies use these.
        read: ['17px', { lineHeight: '1.5' }],
        'read-lg': ['19px', { lineHeight: '1.5' }],
      },
      spacing: {
        // 2 / 4 / 8 / 12 / 16 / 24 / 40 — terminal density, loosened enough to read.
        0.5: '2px',
        4.5: '18px',
      },
      borderRadius: {
        // Terminals do not round. There is no radius scale on purpose.
        none: '0',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        flash: {
          '0%': { backgroundColor: 'rgba(255,160,47,0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        // Caret only. State changes flip instantly; nothing here eases.
        blink: 'blink 1.1s step-end infinite',
        flash: 'flash 80ms linear 1',
      },
    },
  },
  plugins: [],
};

export default config;
