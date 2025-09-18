/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Tango Color Palette
      colors: {
        // Tango Butter
        'tango-butter': {
          1: '#fce94f',
          2: '#edd400',
          3: '#c4a000',
          DEFAULT: '#edd400',
        },
        // Tango Orange
        'tango-orange': {
          1: '#fcaf3e',
          2: '#f57900',
          3: '#ce5c00',
          DEFAULT: '#f57900',
        },
        // Tango Chocolate
        'tango-chocolate': {
          1: '#e9b96e',
          2: '#c17d11',
          3: '#8f5902',
          DEFAULT: '#c17d11',
        },
        // Tango Chameleon
        'tango-chameleon': {
          1: '#8ae234',
          2: '#73d216',
          3: '#4e9a06',
          DEFAULT: '#73d216',
        },
        // Tango Sky Blue
        'tango-sky-blue': {
          1: '#729fcf',
          2: '#3465a4',
          3: '#204a87',
          DEFAULT: '#3465a4',
        },
        // Tango Plum
        'tango-plum': {
          1: '#ad7fa8',
          2: '#75507b',
          3: '#5c3566',
          DEFAULT: '#75507b',
        },
        // Tango Scarlet Red
        'tango-scarlet-red': {
          1: '#ef2929',
          2: '#cc0000',
          3: '#a40000',
          DEFAULT: '#cc0000',
        },
        // Tango Aluminium
        'tango-aluminium': {
          1: '#eeeeec',
          2: '#d3d7cf',
          3: '#babdb6',
          4: '#888a85',
          5: '#555753',
          6: '#2e3436',
          DEFAULT: '#babdb6',
        },

        // Semantic mappings to Tango colors
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          DEFAULT: 'var(--color-primary-500)',
        },
        secondary: {
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
          DEFAULT: 'var(--color-secondary-500)',
        },
        accent: {
          50: 'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
          DEFAULT: 'var(--color-accent-500)',
        },
        success: {
          50: 'var(--color-success-50)',
          100: 'var(--color-success-100)',
          200: 'var(--color-success-200)',
          300: 'var(--color-success-300)',
          400: 'var(--color-success-400)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
          800: 'var(--color-success-800)',
          900: 'var(--color-success-900)',
          DEFAULT: 'var(--color-success-500)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          200: 'var(--color-warning-200)',
          300: 'var(--color-warning-300)',
          400: 'var(--color-warning-400)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
          800: 'var(--color-warning-800)',
          900: 'var(--color-warning-900)',
          DEFAULT: 'var(--color-warning-500)',
        },
        error: {
          50: 'var(--color-error-50)',
          100: 'var(--color-error-100)',
          200: 'var(--color-error-200)',
          300: 'var(--color-error-300)',
          400: 'var(--color-error-400)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
          800: 'var(--color-error-800)',
          900: 'var(--color-error-900)',
          DEFAULT: 'var(--color-error-500)',
        },
        info: {
          50: 'var(--color-info-50)',
          100: 'var(--color-info-100)',
          200: 'var(--color-info-200)',
          300: 'var(--color-info-300)',
          400: 'var(--color-info-400)',
          500: 'var(--color-info-500)',
          600: 'var(--color-info-600)',
          700: 'var(--color-info-700)',
          800: 'var(--color-info-800)',
          900: 'var(--color-info-900)',
          DEFAULT: 'var(--color-info-500)',
        },

        // Tango-specific semantic colors
        background: {
          DEFAULT: 'var(--tango-bg)',
          alt: 'var(--tango-bg-alt)',
        },
        text: {
          DEFAULT: 'var(--tango-text)',
          secondary: 'var(--tango-text-secondary)',
        },
        border: {
          DEFAULT: 'var(--tango-border)',
          focus: 'var(--tango-border-focus)',
        },
        selection: {
          bg: 'var(--tango-selection-bg)',
          text: 'var(--tango-selection-text)',
        },
      },

      // Spacing using Tango tokens
      spacing: {
        'tango-xs': 'var(--tango-space-xs)',
        'tango-sm': 'var(--tango-space-sm)',
        'tango-md': 'var(--tango-space-md)',
        'tango-lg': 'var(--tango-space-lg)',
        'tango-xl': 'var(--tango-space-xl)',
        'tango-2xl': 'var(--tango-space-2xl)',
        'tango-3xl': 'var(--tango-space-3xl)',
      },

      // Border radius using Tango tokens
      borderRadius: {
        'tango-none': 'var(--tango-radius-none)',
        'tango-sm': 'var(--tango-radius-sm)',
        'tango-md': 'var(--tango-radius-md)',
        'tango-lg': 'var(--tango-radius-lg)',
        'tango-xl': 'var(--tango-radius-xl)',
        'tango-2xl': 'var(--tango-radius-2xl)',
        'tango-full': 'var(--tango-radius-full)',
      },

      // Box shadows using Tango tokens
      boxShadow: {
        'tango-xs': 'var(--tango-shadow-xs)',
        'tango-sm': 'var(--tango-shadow-sm)',
        'tango-md': 'var(--tango-shadow-md)',
        'tango-lg': 'var(--tango-shadow-lg)',
        'tango-xl': 'var(--tango-shadow-xl)',
        'tango-2xl': 'var(--tango-shadow-2xl)',
      },

      // Animation using Tango tokens
      animation: {
        'tango-fade-in': 'tango-fade-in var(--tango-motion-duration-base) var(--tango-motion-easing-standard)',
        'tango-slide-up': 'tango-slide-up var(--tango-motion-duration-base) var(--tango-motion-easing-decelerate)',
        'tango-slide-down': 'tango-slide-down var(--tango-motion-duration-base) var(--tango-motion-easing-decelerate)',
        'tango-scale-in': 'tango-scale-in var(--tango-motion-duration-base) var(--tango-motion-easing-standard)',
      },

      // Keyframes for Tango animations
      keyframes: {
        'tango-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'tango-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'tango-slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'tango-scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      // Extend existing theme with Tango-specific utilities
      fontFamily: {
        tango: [
          'var(--font-family-sans)',
          'system-ui',
          'sans-serif',
        ],
        'tango-mono': [
          'var(--font-family-mono)',
          'monospace',
        ],
      },

      // Focus styles with Tango colors
      outline: {
        tango: '2px solid var(--tango-border-focus)',
      },

      // Extend transition duration with Tango tokens
      transitionDuration: {
        'tango-fast': 'var(--tango-motion-duration-fast)',
        'tango-base': 'var(--tango-motion-duration-base)',
        'tango-slow': 'var(--tango-motion-duration-slow)',
      },

      // Extend transition timing with Tango tokens
      transitionTimingFunction: {
        'tango-linear': 'var(--tango-motion-easing-linear)',
        'tango-standard': 'var(--tango-motion-easing-standard)',
        'tango-accelerate': 'var(--tango-motion-easing-accelerate)',
        'tango-decelerate': 'var(--tango-motion-easing-decelerate)',
      },
    },
  },
  plugins: [
    // Plugin for Tango-specific utilities
    function({ addUtilities, addComponents, theme }) {
      // Tango-specific utilities
      addUtilities({
        '.tango-focus-ring': {
          outline: '2px solid var(--tango-border-focus)',
          'outline-offset': '2px',
        },
        '.tango-focus-visible:focus-visible': {
          'box-shadow': '0 0 0 2px var(--tango-bg), 0 0 0 4px var(--tango-border-focus)',
        },
        '.tango-button': {
          'background-color': 'var(--tango-button-bg)',
          'color': 'var(--tango-button-text)',
          'border-color': 'var(--tango-button-border)',
          '&:hover': {
            'background-color': 'var(--tango-button-hover-bg)',
          },
          '&:active': {
            'background-color': 'var(--tango-button-active-bg)',
          },
          '&:disabled': {
            'background-color': 'var(--tango-button-disabled-bg)',
            'color': 'var(--tango-button-disabled-text)',
            'cursor': 'not-allowed',
          },
        },
        '.tango-input': {
          'background-color': 'var(--tango-input-bg)',
          'color': 'var(--tango-input-text)',
          'border-color': 'var(--tango-input-border)',
          '&::placeholder': {
            'color': 'var(--tango-input-placeholder)',
          },
          '&:focus': {
            'border-color': 'var(--tango-input-focus-border)',
          },
        },
        '.tango-card': {
          'background-color': 'var(--tango-card-bg)',
          'border-color': 'var(--tango-card-border)',
          'box-shadow': 'var(--tango-card-shadow)',
        },
      })

      // Tango-specific components
      addComponents({
        '.tango-badge': {
          'background-color': 'var(--tango-sky-blue-2)',
          'color': 'white',
          'padding': '0.25rem 0.5rem',
          'border-radius': 'var(--tango-radius-sm)',
          'font-size': '0.875rem',
          'font-weight': '500',
        },
        '.tango-alert': {
          'background-color': 'var(--tango-aluminium-1)',
          'border': '1px solid var(--tango-aluminium-3)',
          'border-radius': 'var(--tango-radius-md)',
          'padding': '1rem',
        },
        '.tango-alert-info': {
          'background-color': 'var(--tango-orange-1)',
          'border-color': 'var(--tango-orange-2)',
        },
        '.tango-alert-success': {
          'background-color': 'var(--tango-chameleon-1)',
          'border-color': 'var(--tango-chameleon-2)',
        },
        '.tango-alert-warning': {
          'background-color': 'var(--tango-butter-1)',
          'border-color': 'var(--tango-butter-2)',
        },
        '.tango-alert-error': {
          'background-color': 'var(--tango-scarlet-red-1)',
          'border-color': 'var(--tango-scarlet-red-2)',
        },
      })
    },
  ],
  darkMode: ['class', '[data-theme="tango-dark"]'],
}