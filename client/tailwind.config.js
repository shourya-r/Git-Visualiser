/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'git-blue': '#0366d6',
        'git-green': '#28a745',
        'git-red': '#d73a49',
        'git-orange': '#f66a0a',
        'git-purple': '#6f42c1',
      },
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      }
    },
  },
  plugins: [],
} 