import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        background: '#0B0F19',
        foreground: '#F8FAFC',
        surface: {
          DEFAULT: '#111827',
          elevated: '#1E293B',
          overlay: '#0F172A',
        },
        card: {
          DEFAULT: '#111827',
          foreground: '#F8FAFC',
        },
        border: {
          DEFAULT: '#1F2937',
          subtle: '#1E293B',
          hover: '#374151',
        },
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          foreground: '#FFFFFF',
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        secondary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#0D9488',
          hover: '#0F766E',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#1E293B',
          foreground: '#94A3B8',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#10B981',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(37, 99, 235, 0.25)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
