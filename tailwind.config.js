/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        xunaris: {
          primary: '#0063f2',
          blue: '#0066ff',
          indigo: '#6366f1',
          green: '#00d084',
          navy: '#0a1120',
          dark: '#020617',
          slate: '#0f172a',
          surface: '#1e293b',
          canvas: '#f8fafc'
        },
        hyra: {
          navy: '#0f172a',
          signal: '#0070f3',
          link: '#0b5fd0',
          heat: '#ea580c',
          gold: '#f59e0b',
          amber: '#fbbf24',
          success: '#00d084',
          surface: '#111827',
          dark: '#030712'
        },
        hira: {
          navy: '#0f172a',
          signal: '#0070f3',
          link: '#0b5fd0',
          heat: '#ea580c',
          gold: '#f59e0b',
          amber: '#fbbf24',
          success: '#00d084',
          surface: '#111827',
          dark: '#030712'
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
