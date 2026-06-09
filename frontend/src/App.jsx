import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import HacerPedido from './pages/HacerPedido.jsx'
import PedidoDatos from './pages/PedidoDatos.jsx'
import OrderCatalog from './pages/OrderCatalog.jsx'
import OrderConfirmation from './pages/OrderConfirmation.jsx'

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
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hacer-pedido" element={<HacerPedido />} />

          {/* Step 2: product catalog + cart */}
          <Route path="/hacer-pedido/recoger" element={<OrderCatalog mode="recoger" />} />
          <Route path="/hacer-pedido/domicilio" element={<OrderCatalog mode="domicilio" />} />

          {/* Step 1.5: address/timing/age form (mode via ?mode=) */}
          <Route path="/hacer-pedido/datos" element={<PedidoDatos />} />

          {/* Step 3: confirmation (pago contra reembolso) */}
          <Route path="/hacer-pedido/confirmar" element={<OrderConfirmation />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
