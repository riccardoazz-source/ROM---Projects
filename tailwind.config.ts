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
          50:  '#EDF4F8',
          100: '#D0E4ED',
          200: '#A1C9DB',
          300: '#72AEC9',
          400: '#3D8DB2',
          500: '#2589A8',   // brand teal (building lighter)
          600: '#1C6A87',
          700: '#1C4F6C',   // brand teal dark (building darker)
          800: '#1C3D54',   // brand navy (ROM text)
          900: '#122737',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'rom': '0 4px 24px rgba(28, 61, 84, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
