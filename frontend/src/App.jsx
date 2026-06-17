import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Carta from './pages/Carta.jsx'
import HacerPedido from './pages/HacerPedido.jsx'
import PedidoDatos from './pages/PedidoDatos.jsx'
import OrderCatalog from './pages/OrderCatalog.jsx'
import OrderConfirmation from './pages/OrderConfirmation.jsx'
import Reservas from './pages/Reservas.jsx'
import Trabaja from './pages/Trabaja.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import AvisoLegal from './pages/AvisoLegal.jsx'
import PoliticaPrivacidad from './pages/PoliticaPrivacidad.jsx'
import PoliticaCookies from './pages/PoliticaCookies.jsx'
import CondicionesVenta from './pages/CondicionesVenta.jsx'
import MisDirecciones from './pages/MisDirecciones.jsx'
import AdminOffice from './pages/AdminOffice.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Flujo de pedido (los datos se piden ANTES del catálogo, porque la barra de
// checkout muestra la dirección durante la navegación):
//   /hacer-pedido              — elegir recoger o domicilio (HacerPedido)
//   /hacer-pedido/datos?mode=  — dirección/horario/edad (PedidoDatos)
//   /hacer-pedido/recoger      — catálogo, modo recoger (OrderCatalog)
//   /hacer-pedido/domicilio    — catálogo, modo domicilio (OrderCatalog)
//   /hacer-pedido/confirmar    — confirmación, pago contra reembolso (OrderConfirmation)

// PublicLayout — wraps public pages with the shared Header + Footer.
function PublicLayout({ children }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ── Admin backoffice ────────────────────────────────────────────────── */}
        {/* Full-page layout (no public Header/Footer). NOT linked from any      */}
        {/* public page — the admin reaches it by typing the URL directly.       */}
        {/* Real access control is enforced server-side by `requireAdmin`.       */}
        <Route
          path="/adminoffice"
          element={
            <ProtectedRoute requireAdmin>
              <AdminOffice />
            </ProtectedRoute>
          }
        />

        {/* ── Public routes (wrapped in shared Header + Footer) ──────────────── */}

        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />

        {/* Read-only catalog — accessible to everyone; interactive only when logged in */}
        <Route path="/carta" element={<PublicLayout><Carta /></PublicLayout>} />

        <Route path="/hacer-pedido" element={<PublicLayout><HacerPedido /></PublicLayout>} />

        {/* Step 2: product catalog + cart */}
        <Route path="/hacer-pedido/recoger" element={<PublicLayout><OrderCatalog mode="recoger" /></PublicLayout>} />
        <Route path="/hacer-pedido/domicilio" element={<PublicLayout><OrderCatalog mode="domicilio" /></PublicLayout>} />

        {/* Step 1.5: address/timing/age form (mode via ?mode=) */}
        <Route path="/hacer-pedido/datos" element={<PublicLayout><PedidoDatos /></PublicLayout>} />

        {/* Step 3: confirmation (pago contra reembolso) */}
        <Route path="/hacer-pedido/confirmar" element={<PublicLayout><OrderConfirmation /></PublicLayout>} />

        {/* Reservations — step 1: date/time/zone/guests form */}
        <Route path="/reservar" element={<PublicLayout><Reservas /></PublicLayout>} />

        {/* Jobs application form */}
        <Route path="/trabaja" element={<PublicLayout><Trabaja /></PublicLayout>} />

        {/* Auth pages */}
        <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
        <Route path="/registro" element={<PublicLayout><Registro /></PublicLayout>} />

        {/* Account pages (require login — guard is inside the page component) */}
        <Route path="/mis-direcciones" element={<PublicLayout><MisDirecciones /></PublicLayout>} />

        {/* Páginas legales (texto informativo) */}
        <Route path="/aviso-legal" element={<PublicLayout><AvisoLegal /></PublicLayout>} />
        <Route path="/politica-privacidad" element={<PublicLayout><PoliticaPrivacidad /></PublicLayout>} />
        <Route path="/politica-cookies" element={<PublicLayout><PoliticaCookies /></PublicLayout>} />
        <Route path="/condiciones-venta" element={<PublicLayout><CondicionesVenta /></PublicLayout>} />
      </Routes>
    </>
  )
}
