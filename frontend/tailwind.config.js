/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        'vault-bg': '#0a0e1a',
        'vault-card': '#1a2035',
        'vault-border': '#2a3555',
        'vault-gold': '#ffd700',
        'vault-cyan': '#00ffff',
        'vault-red': '#ff4444',
        'vault-green': '#44ff44',
      },
    },
  },
  plugins: [],
};
