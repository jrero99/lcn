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

// Flujo de pedido (los datos se piden ANTES del catálogo, porque la barra de
// checkout muestra la dirección durante la navegación):
//   /hacer-pedido              — elegir recoger o domicilio (HacerPedido)
//   /hacer-pedido/datos?mode=  — dirección/horario/edad (PedidoDatos)
//   /hacer-pedido/recoger      — catálogo, modo recoger (OrderCatalog)
//   /hacer-pedido/domicilio    — catálogo, modo domicilio (OrderCatalog)
//   /hacer-pedido/confirmar    — confirmación, pago contra reembolso (OrderConfirmation)

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Read-only catalog — accessible to everyone; interactive only when logged in */}
          <Route path="/carta" element={<Carta />} />

          <Route path="/hacer-pedido" element={<HacerPedido />} />

          {/* Step 2: product catalog + cart */}
          <Route path="/hacer-pedido/recoger" element={<OrderCatalog mode="recoger" />} />
          <Route path="/hacer-pedido/domicilio" element={<OrderCatalog mode="domicilio" />} />

          {/* Step 1.5: address/timing/age form (mode via ?mode=) */}
          <Route path="/hacer-pedido/datos" element={<PedidoDatos />} />

          {/* Step 3: confirmation (pago contra reembolso) */}
          <Route path="/hacer-pedido/confirmar" element={<OrderConfirmation />} />

          {/* Reservations — step 1: date/time/zone/guests form */}
          <Route path="/reservar" element={<Reservas />} />

          {/* Jobs application form (mock — no backend yet) */}
          <Route path="/trabaja" element={<Trabaja />} />

          {/* Auth pages — mock only, TODO: integrate POST /api/auth/login and /register */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          {/* Páginas legales (texto informativo) */}
          <Route path="/aviso-legal" element={<AvisoLegal />} />
          <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
          <Route path="/politica-cookies" element={<PoliticaCookies />} />
          <Route path="/condiciones-venta" element={<CondicionesVenta />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
