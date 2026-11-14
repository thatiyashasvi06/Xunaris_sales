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
        // Brand scales sampled from the logos. HYRA Connect = royal blue, Xunaris = cyan.
        hyra: {
          50: '#EEF3FF', 100: '#DCE6FF', 200: '#B9CCFF', 300: '#8CA9F5', 400: '#5A7FE6',
          500: '#2F58CC', 600: '#1A41B3', 700: '#0A2E9C', 800: '#082478', 900: '#061A55',
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
        xun: {
          50: '#E6F9FF', 100: '#BFEFFF', 200: '#8FE3FA', 300: '#57D2F2', 400: '#1FC0EB',
          500: '#00B4E6', 600: '#0096C2', 700: '#00779B', 800: '#005A76', 900: '#003F54'
        },
        ink: { 950: '#070E22', 900: '#0B1630', 800: '#111F42', 700: '#1B2B57' },
        canvas: '#F6F7FB',
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
