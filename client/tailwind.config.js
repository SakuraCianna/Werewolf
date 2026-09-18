/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DengXian"', '"等线"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"DengXian"', '"等线"', '"Microsoft YaHei"', 'sans-serif'],
        serif: ['"DengXian"', '"等线"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        werewolf: {
          void: '#05070c',
          dark: '#0a0e17',
          card: '#111827',
          cardHover: '#1f293d',
          gold: '#f59e0b',
          goldLight: '#fde68a',
          blood: '#dc2626',
          bloodDark: '#7f1d1d',
          purple: '#9333ea',
          emerald: '#059669',
          night: '#0f172a',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-bar': 'waveBar 0.8s ease-in-out infinite alternate',
        'spin-slow': 'spin 30s linear infinite',
        'spin-reverse-slow': 'spinReverse 40s linear infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(225, 29, 72, 0.3)' },
          '50%': { boxShadow: '0 0 35px rgba(225, 29, 72, 0.8)' },
        },
        waveBar: {
          '0%': { height: '15%' },
          '100%': { height: '100%' },
        },
        spinReverse: {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.9' },
        },
      },
      boxShadow: {
        'gothic-card': '0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
        'gothic-gold': '0 0 25px -5px rgba(245, 158, 11, 0.4), 0 0 1px 1px rgba(245, 158, 11, 0.6)',
        'gothic-blood': '0 0 30px -5px rgba(220, 38, 38, 0.5), 0 0 1px 1px rgba(220, 38, 38, 0.7)',
        'tabletop': 'inset 0 0 120px rgba(0, 0, 0, 0.95), 0 20px 50px rgba(0, 0, 0, 0.9)',
      },
    },
  },
  plugins: [],
};
