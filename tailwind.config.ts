import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07060B',
          900: '#0B0912',
          850: '#100D1A',
          800: '#161221',
          700: '#221C33',
          600: '#2F2746',
        },
        chalk: {
          DEFAULT: '#EDEAF5',
          dim: '#A49DB8',
          faint: '#6B6480',
        },
        violet: {
          DEFAULT: '#7C5CFF',
          soft: '#A08CFF',
          deep: '#4B2FD6',
        },
        mint: '#3BE8B0',
        ember: '#FF6B4A',
      },
      fontFamily: {
        // The inline fallback matters: a bare var(--font-sans) that never gets
        // defined invalidates the whole declaration and the page silently drops
        // to the browser's default serif.
        sans: ['var(--font-sans, ui-sans-serif)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono, ui-monospace)', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.75' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        glow: 'pulseGlow 4s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
