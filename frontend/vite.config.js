import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Google Identity Services script — only injected into index.html when auth is
// enabled (VITE_ENABLE_AUTH=true). The public static site does not load it.
function googleIdentityScript(authEnabled) {
  return {
    name: 'lcn-google-identity-script',
    transformIndexHtml() {
      if (!authEnabled) return []
      return [
        {
          tag: 'script',
          attrs: { src: 'https://accounts.google.com/gsi/client', async: true, defer: true },
          injectTo: 'head',
        },
      ]
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    // Dominio propio: la web se sirve desde la raíz ('/').
    // GitHub Pages (CI) la sirve bajo /lcn/ (https://jrero99.github.io/lcn/).
    base: process.env.GITHUB_ACTIONS ? '/lcn/' : '/',
    plugins: [react(), googleIdentityScript(env.VITE_ENABLE_AUTH === 'true')],
    server: {
      port: 5173,
      open: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      css: false,
      // Tests run against the full app (orders + auth + online forms on).
      // Static-site behaviour is tested by mocking src/config/features.js.
      env: {
        VITE_ENABLE_AUTH: 'true',
        VITE_ENABLE_ORDERS: 'true',
        VITE_ENABLE_ONLINE_FORMS: 'true',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        include: ['src/**/*.{js,jsx}'],
        exclude: [
          'src/main.jsx',
          'src/App.jsx',                // React Router shell — tested implicitly via page tests
          'src/assets/**',
          'src/data/catalogMockData.js',
          'src/data/staticCatalog.js',
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
  }
})
