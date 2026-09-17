/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        werewolf: {
          dark: '#0a0d14',
          card: '#121824',
          blood: '#8b0000',
          accent: '#e11d48',
          gold: '#f59e0b',
          silver: '#94a3b8',
          night: '#0f172a',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-bar': 'waveBar 1s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(225, 29, 72, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(225, 29, 72, 0.9)' },
        },
        waveBar: {
          '0%': { height: '20%' },
          '100%': { height: '100%' },
        },
      },
    },
  },
  plugins: [],
};
