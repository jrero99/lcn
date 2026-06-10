import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Modal from '../components/Modal.jsx'

// Cierre del flujo de pedido. El pago es contra reembolso (tarjeta o efectivo
// al repartidor), así que aquí no hay cobro online: solo confirmación.
//
// El modal se abre automáticamente al llegar a esta página.
// Cuando el backend esté listo, bastará con pasarle `title` y `message`
// desde la respuesta de la API (ver comentarios en Modal.jsx).

export default function OrderConfirmation() {
  const { state } = useLocation()
  const mode = state?.mode === 'recoger' ? 'recoger' : 'domicilio'
  const total = state?.total ?? 0
  const items = state?.items ?? []

  // Modal visible by default when the page mounts.
  // Future: can be tied to an API response — e.g. show after POST /api/orders resolves.
  const [modalOpen, setModalOpen] = useState(true)

  // Future API integration example:
  //   const { data, isSuccess } = useCreateOrder(orderPayload)
  //   const modalTitle   = data?.confirmationTitle   ?? undefined  // falls back to Modal default
  //   const modalMessage = data?.confirmationMessage ?? undefined  // falls back to Modal default
  //   <Modal isOpen={isSuccess} title={modalTitle} message={modalMessage} onClose={...} />

  return (
    <>
      {/* Confirmation modal — shown on page mount */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        // title and message use Modal defaults until the API provides them:
        //   title="¡GRACIAS POR TU PEDIDO!"
        //   message="Hemos recibido tu pedido correctamente..."
      />

      {/* Page content — visible under / after the modal */}
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
    </>
  )
}
