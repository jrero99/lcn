import { Link, useLocation } from 'react-router-dom'

// Cierre del flujo de pedido. El pago es contra reembolso (tarjeta o efectivo
// al repartidor), así que aquí no hay cobro online: solo confirmación.
export default function OrderConfirmation() {
  const { state } = useLocation()
  const mode = state?.mode === 'recoger' ? 'recoger' : 'domicilio'
  const total = state?.total ?? 0
  const items = state?.items ?? []

  return (
    <section className="datos confirm">
      <h1 className="datos-title">¡Comanda rebuda!</h1>
      <p className="datos-sub">
        {mode === 'recoger'
          ? 'Podràs recollir-la al local. Pagaràs en recollir-la.'
          : 'Te la portem a casa. Pagaràs al repartidor en rebre-la.'}
      </p>

      {items.length > 0 && (
        <ul className="confirm-list">
          {items.map((it) => (
            <li key={it.id}>
              <span>{it.quantity}× {it.name}</span>
              <span>{(it.price * it.quantity).toFixed(2).replace('.', ',')} €</span>
            </li>
          ))}
          <li className="confirm-total">
            <span>Total</span>
            <span>{total.toFixed(2).replace('.', ',')} €</span>
          </li>
        </ul>
      )}

      <div className="confirm-actions">
        <Link className="btn btn-outline" to="/">Volver al inicio</Link>
        <Link className="btn btn-solid" to="/hacer-pedido">Hacer otro pedido</Link>
      </div>
    </section>
  )
}
