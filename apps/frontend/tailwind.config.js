/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        solarized: {
          base03: 'var(--color-solarized-base03)',
          base02: 'var(--color-solarized-base02)',
          base01: 'var(--color-solarized-base01)',
          base00: 'var(--color-solarized-base00)',
          base0: 'var(--color-solarized-base0)',
          base1: 'var(--color-solarized-base1)',
          base2: 'var(--color-solarized-base2)',
          base3: 'var(--color-solarized-base3)',
          yellow: 'var(--color-solarized-yellow)',
          orange: 'var(--color-solarized-orange)',
          red: 'var(--color-solarized-red)',
          magenta: 'var(--color-solarized-magenta)',
          violet: 'var(--color-solarized-violet)',
          blue: 'var(--color-solarized-blue)',
          cyan: 'var(--color-solarized-cyan)',
          green: 'var(--color-solarized-green)',
        },
        gaming: {
          base: 'var(--color-bg-base)',
          card: 'var(--color-bg-card)',
          border: 'var(--color-border)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        status: {
          locked: 'var(--color-status-locked)',
          completed: 'var(--color-status-completed)',
          campfire: 'var(--color-status-campfire)',
          quest: 'var(--color-status-quest)',
          boss: 'var(--color-status-boss)',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('daisyui')],
};
