import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rom: {
          50: '#EEF4FB',
          100: '#D5E4F4',
          200: '#ABCAE9',
          300: '#82AFDE',
          400: '#5895D3',
          500: '#2B6CB0',
          600: '#1B3A5C',
          700: '#142D47',
          800: '#0E1F31',
          900: '#07121C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
