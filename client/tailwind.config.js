/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crimson: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          500: '#f43f5e',
          600: '#dc2626',
          700: '#DC143C', // Primary Crimson
          800: '#9f1239',
          900: '#881337',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e3ebe3',
          500: '#4A7C59', // Muted Green Accent
          600: '#3B6447',
          700: '#2C4C35',
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        heading: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      boxShadow: {
        'soft': '0 10px 30px -5px rgba(220, 20, 60, 0.08)',
        'card': '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
        'elevated': '0 20px 40px -15px rgba(0, 0, 0, 0.12)'
      }
    },
  },
  plugins: [],
}
