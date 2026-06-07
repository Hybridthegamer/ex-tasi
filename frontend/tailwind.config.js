/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        terracotta: {
          50:  '#fdf4ef',
          100: '#fbe5d5',
          200: '#f5c8aa',
          300: '#eda47a',
          400: '#e47748',
          500: '#D4603A',
          600: '#c44e2a',
          700: '#a33c22',
          800: '#843123',
          900: '#6c2b21',
        },
        violet: {
          50:  '#f3f1fb',
          100: '#e8e3f5',
          400: '#9c86d4',
          500: '#7B5EA7',
          600: '#6B5BA6',
          700: '#5a4a8c',
        },
        amber: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F0B429',
        }
      },
      fontFamily: {
        serif:  ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:   ['"Nunito"', 'sans-serif'],
      },
      boxShadow: {
        warm:   '0 4px 24px rgba(212, 96, 58, 0.12)',
        'warm-lg': '0 8px 40px rgba(212, 96, 58, 0.18)',
        card:   '0 2px 12px rgba(44, 24, 16, 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
};