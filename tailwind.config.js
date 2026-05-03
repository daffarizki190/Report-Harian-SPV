/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./public/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e293b',
        accent: '#3b82f6',
      }
    },
  },
  plugins: [],
}
