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
        'src/App.jsx',                // React Router shell — tested implicitly via page tests
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
        // ProtectedRoute, PedidoDatos & MisDirecciones have dedicated test files
        // that crash the V8 coverage worker (Vitest 4.1.9 + jsdom 29 OOM bug with
        // role="status" aria-live="polite" elements causing infinite microtask queues
        // during GC). Their logic is verified through other integration tests.
        'src/components/ProtectedRoute.jsx',
        'src/pages/PedidoDatos.jsx',
        'src/pages/MisDirecciones.jsx',
        // GoogleSignInButton depends on @react-oauth/google — no unit tests
        'src/components/GoogleSignInButton.jsx',
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
