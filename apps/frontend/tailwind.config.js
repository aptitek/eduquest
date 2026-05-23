/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gaming: {
          dark: '#09090b',
          card: 'rgba(18, 18, 24, 0.8)',
          border: 'rgba(255, 255, 255, 0.1)',
          gold: '#f59e0b',
          xp: '#a855f7',
        }
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
