/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F8F6F1',
        'ivory-2': '#F1EDE5',
        card: '#FFFFFF',
        champagne: {
          DEFAULT: '#C6A875',
          light: '#D9C39E',
          dark: '#A88860',
        },
        espresso: '#39332E',
        taupe: '#A99C8B',
        sage: '#87947D',
        rose: {
          DEFAULT: '#C58F87',
          light: '#D9AEA8',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(57,51,46,0.06), 0 4px 16px rgba(57,51,46,0.05)',
        card: '0 2px 8px rgba(57,51,46,0.04), 0 12px 32px rgba(57,51,46,0.06)',
        lift: '0 8px 30px rgba(57,51,46,0.12)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
