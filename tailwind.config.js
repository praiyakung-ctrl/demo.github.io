/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"TH Sarabun New"', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#1B3A6B',
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1B3A6B',
        },
        event: {
          traffic: '#F97316',
          gunshot: '#EF4444',
          parking: '#92400E',
          flood:   '#3B82F6',
          crowd:   '#EAB308',
        },
        status: {
          online:  '#22C55E',
          offline: '#9CA3AF',
        },
        req: {
          new:     '#22C55E',
          pending: '#EAB308',
          waiting: '#3B82F6',
          sent:    '#6B7280',
          done:    '#1B3A6B',
        },
      },
    },
  },
  plugins: [],
}

