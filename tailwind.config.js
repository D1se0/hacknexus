/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0b0f0d',
        panel: '#121714',
        edge: '#232b26',
        ink: '#d9e2db',
        grey: '#8a948d',
        acento: { DEFAULT: '#2ee88a', bright: '#7dffc0', dark: '#17a85f' },
        ok: '#3fb850',
        warn: '#ffb454',
        bad: '#ff5c78',
        info: '#4fb0ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.5)',
        glow: '0 0 24px 0 rgba(46,232,138,0.4)',
        'glow-lg': '0 0 60px 0 rgba(46,232,138,0.25)',
        'glow-info': '0 0 24px 0 rgba(79,176,255,0.35)',
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
