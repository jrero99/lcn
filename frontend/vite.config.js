import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages sirve el proyecto bajo /lcn/ (https://jrero99.github.io/lcn/).
  // En local (dev/preview) usamos '/'.
  base: process.env.GITHUB_ACTIONS ? '/lcn/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/assets/**',
        'src/data/catalogMockData.js',
        'src/data/business.js',
        'src/pages/admin/**',
        'src/pages/AdminOffice.jsx',
        'src/pages/Carta.jsx',
        'src/pages/AvisoLegal.jsx',
        'src/pages/CondicionesVenta.jsx',
        'src/pages/PoliticaCookies.jsx',
        'src/pages/PoliticaPrivacidad.jsx',
        'src/pages/Trabaja.jsx',
        'src/pages/Home.jsx',
        'src/components/LegalPage.jsx',
        'src/components/Marquee.jsx',
        'src/components/Logo.jsx',
        'src/components/ScrollToTop.jsx',
        'src/components/Footer.jsx',
        'src/components/CategoryNav.jsx',
        'src/test/**',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
})
