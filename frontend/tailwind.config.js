export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        'tg-bg': 'var(--tg-theme-bg-color)',
        'tg-text': 'var(--tg-theme-text-color)',
        'tg-hint': 'var(--tg-theme-hint-color)',
        'tg-link': 'var(--tg-theme-link-color)',
        'tg-button': 'var(--tg-theme-button-color)',
        'tg-button-text': 'var(--tg-theme-button-text-color)',
        brand: {
          50: '#F0F5FF',
          100: '#E0EAFF',
          200: '#C7D7FF',
          300: '#A6BFFF',
          400: '#7D9EFF',
          500: '#557EFF',
          600: '#3C64E6',
          700: '#2C4BB3',
          800: '#1D337A',
          900: '#111E4D'
        }
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0, 0, 0, 0.04)",
        glow: "0 0 20px rgba(85, 126, 255, 0.3)",
        'glow-lg': "0 0 40px rgba(85, 126, 255, 0.2)",
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'fade-in-up': { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        'pulse-soft': { '0%,100%': { opacity: 0.8 }, '50%': { opacity: 1 } },
        'float': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'shimmer': {
          '0%': { transform: 'translateX(-150%) skewX(-12deg)' },
          '100%': { transform: 'translateX(150%) skewX(-12deg)' }
        },
        'slide-left': {
          '0%': { opacity: 0, transform: 'translateX(8px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' }
        },
        'slide-right': {
          '0%': { opacity: 0, transform: 'translateX(-8px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'shimmer': 'shimmer 2s infinite',
        'slide-left': 'slide-left 0.7s cubic-bezier(0.4, 0, 0.2, 1) both',
        'slide-right': 'slide-right 0.7s cubic-bezier(0.4, 0, 0.2, 1) both'
      }
    }
  },
  plugins: []
}
