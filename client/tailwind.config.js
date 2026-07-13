/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F5F2',
          100: '#C5E8DF',
          200: '#9DDCCB',
          300: '#6FC9B0',
          400: '#45B095',
          500: '#2A9A7D',
          600: '#1F7A64',
          700: '#1A6253',
          800: '#154E42',
          900: '#0F3A31'
        },
        accent: {
          50: '#FEF5E7',
          100: '#FDE8C7',
          200: '#FBD58E',
          300: '#F9C55A',
          400: '#F5B042',
          500: '#E89C2A',
          600: '#C97E1A',
          700: '#A36214',
          800: '#7D4A10',
          900: '#5C3810'
        },
        neutral: {
          0: '#FFFFFF',
          50: '#F7F8F6',
          100: '#EDF0EB',
          200: '#D8DDD4',
          300: '#B8C0B5',
          400: '#8A9387',
          500: '#5C655B',
          600: '#3E463E',
          700: '#2B322B',
          800: '#1C221D',
          900: '#0F1410'
        },
        background: '#F7F8F6',
        surface: '#FFFFFF',
        surfaceAlt: '#EDF0EB',
        text: {
          primary: '#1C221D',
          secondary: '#5C655B',
          muted: '#8A9387',
          inverse: '#FFFFFF'
        },
        positive: '#1B8E4E',
        positiveLight: '#E4F5E9',
        negative: '#D14343',
        negativeLight: '#FCE8E8',
        warning: '#E89C2A',
        warningLight: '#FEF5E7',
        account: {
          debit: '#1F7A64',
          debitBg: '#E8F5F2',
          credit: '#C97E1A',
          creditBg: '#FEF5E7',
          lent: '#5B6FBF',
          lentBg: '#EBEEF8',
          borrowed: '#D14343',
          borrowedBg: '#FCE8E8',
          invest: '#8B5CF6',
          investBg: '#F3EFFE'
        },
        chart: {
          expense: [
            '#1F7A64',
            '#2A9A7D',
            '#45B095',
            '#6FC9B0',
            '#E89C2A',
            '#F5B042',
            '#F9C55A',
            '#5B6FBF',
            '#8B5CF6',
            '#D14343'
          ],
          income: [
            '#1B8E4E',
            '#2A9A7D',
            '#45B095',
            '#F5B042',
            '#5B6FBF',
            '#8B5CF6'
          ]
        }
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(15, 20, 16, 0.05)',
        sm: '0 1px 3px 0 rgba(15, 20, 16, 0.08), 0 1px 2px 0 rgba(15, 20, 16, 0.04)',
        md: '0 4px 6px -1px rgba(15, 20, 16, 0.08), 0 2px 4px -2px rgba(15, 20, 16, 0.04)',
        lg: '0 10px 15px -3px rgba(15, 20, 16, 0.08), 0 4px 6px -4px rgba(15, 20, 16, 0.04)',
        xl: '0 20px 25px -5px rgba(15, 20, 16, 0.10), 0 8px 10px -6px rgba(15, 20, 16, 0.04)'
      }
    },
  },
  plugins: [],
}