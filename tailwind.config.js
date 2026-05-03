/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./public/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
        },
        accent: {
          DEFAULT: '#6366f1',
          gold: '#fbbf24',
        },
        'bg-app': '#f8fafc',
        'bg-card': '#ffffff',
        'text-main': '#0f172a',
        'text-dim': '#64748b',
        'border-custom': 'rgba(226, 232, 240, 0.8)',
        error: '#ef4444',
        success: '#10b981',
      },
      borderRadius: {
        'lg-custom': '20px',
        'md-custom': '14px',
      },
      boxShadow: {
        'custom-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'custom': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
