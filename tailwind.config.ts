import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18181b',
        paper: '#fafaf9',
        midnight: '#0C0D10',
        'midnight-2': '#16181C',
        'midnight-3': '#202329',
        bone: '#F3F1EA',
        smoke: '#93959C',
        marker: '#F4C64A',
        'marker-deep': '#D9A62E',
      },
      fontFamily: {
        display: ['var(--font-fraunces)'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        reveal: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        reveal: 'reveal 0.6s 0.5s cubic-bezier(0.65, 0, 0.35, 1) both',
        rise: 'rise 0.7s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
