import { Link } from 'react-router-dom'

// Dues opcions d'inici de comanda. Porten al pas de dades (adreça/horari),
// passant el mode triat per query param perquè sobrevisqui a un refresc.
const OPTIONS = [
  {
    key: 'recoger',
    title: 'Recogerlo en el local',
    to: '/hacer-pedido/datos?mode=recoger',
    lines: ['15% DESCUENTO', 'Para pedidos a través de la web', 'código: CASANOSTRA15'],
  },
  {
    key: 'domicilio',
    title: 'Recibirlo en casa',
    to: '/hacer-pedido/datos?mode=domicilio',
    lines: ['Envío gratis', 'Para pedidos de delivery', 'superiores a 35€'],
  },
]

export default function HacerPedido() {
  return (
    <section className="order-choice">
      <div className="order-choice-grid">
        {OPTIONS.map((opt) => (
          <Link key={opt.key} to={opt.to} className="order-card">
            <h2 className="order-card-title">{opt.title}</h2>
            <p className="order-card-text">
              {opt.lines.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
