/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // MOA Digital brand palette (from final_02/README.txt)
        charcoal: '#0F172A',  // primary background (Tailwind slate-900)
        ink: '#0B1220',       // deeper than charcoal for hero gradient
        surface: '#11192B',   // card surface
        hairline: '#1F2937',  // subtle border
        muted: '#94A3B8',     // secondary text (Tailwind slate-400)
        moa: {
          blue: '#5E6AD2',
          cyan: '#26C6DA',
        },
      },
      fontFamily: {
        sans: [
          'Kanit',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      maxWidth: {
        container: '1200px',
      },
      backgroundImage: {
        'moa-gradient': 'linear-gradient(135deg, #5E6AD2 0%, #26C6DA 100%)',
        'radial-glow': 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94, 106, 210, 0.15), transparent 70%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out both',
        'fade-up': 'fadeUp 0.7s ease-out both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
