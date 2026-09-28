/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Formato rgb(var(--x-rgb) / <alpha-value>): permite modificadores de
           opacidad (bg-acento/90, bg-panel/80…). Los fallbacks coinciden con
           :root de src/index.css y con DEFAULT_THEME de src/lib/theme.ts. */
        base: 'rgb(var(--base-rgb, 11 15 13) / <alpha-value>)',
        panel: 'rgb(var(--panel-rgb, 18 23 20) / <alpha-value>)',
        edge: 'rgb(var(--edge-rgb, 35 43 38) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb, 217 226 219) / <alpha-value>)',
        grey: 'rgb(var(--grey-rgb, 138 148 141) / <alpha-value>)',
        acento: {
          DEFAULT: 'rgb(var(--acento-rgb, 46 232 138) / <alpha-value>)',
          bright: 'rgb(var(--acento-bright-rgb, 125 255 192) / <alpha-value>)',
          dark: 'rgb(var(--acento-dark-rgb, 23 168 95) / <alpha-value>)',
        },
        ok: 'rgb(var(--ok-rgb, 63 184 80) / <alpha-value>)',
        warn: 'rgb(var(--warn-rgb, 255 180 84) / <alpha-value>)',
        bad: 'rgb(var(--bad-rgb, 255 92 120) / <alpha-value>)',
        info: 'rgb(var(--info-rgb, 79 176 255) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans, \'Inter\')', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.5)',
        glow: '0 0 24px 0 rgb(var(--acento-rgb, 46 232 138) / 0.4)',
        'glow-lg': '0 0 60px 0 rgb(var(--acento-rgb, 46 232 138) / 0.25)',
        'glow-info': '0 0 24px 0 rgb(var(--info-rgb, 79 176 255) / 0.35)',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0', animationTimingFunction: 'step-end' } },
        scanline: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
        floatSlow: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseRing: {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        gridDrift: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '48px 48px' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        spin360: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        blink: 'blink 1.1s step-end infinite',
        scanline: 'scanline 8s linear infinite',
        floatSlow: 'floatSlow 6s ease-in-out infinite',
        pulseRing: 'pulseRing 2.6s ease-out infinite',
        gridDrift: 'gridDrift 6s linear infinite',
        shimmer: 'shimmer 3.5s linear infinite',
        spin360: 'spin360 1s linear infinite',
      },
    },
  },
  plugins: [],
}
