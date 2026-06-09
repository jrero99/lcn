import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import HacerPedido from './pages/HacerPedido.jsx'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hacer-pedido" element={<HacerPedido />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
