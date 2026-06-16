import { useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/Modal.jsx'

// Cierre del flujo de pedido. El pago es contra reembolso (tarjeta o efectivo
// al repartidor), así que aquí no hay cobro online: solo confirmación.
//
// El modal se abre automáticamente al llegar a esta página.
// Cuando el backend esté listo, bastará con pasarle `title` y `message`
// desde la respuesta de la API (ver comentarios en Modal.jsx).
//
// Cada `item` en state.items tiene la forma:
//   { key, id, name, unitPrice, quantity, lineTotal,
//     options: [{ groupLabel, choiceLabel }],
//     removedIngredients: string[],
//     notes: string }
// Compatible con items del carrito anterior (que solo tenían { id, name, price, quantity })
// — campos opcionales se tratan con fallback.
//
// BUG-4: if there is no valid navigation state (direct access, hard reload, or
// missing items/mode) the page redirects to /hacer-pedido instead of showing a
// broken confirmation with empty data.

export default function OrderConfirmation() {
  const { state } = useLocation()
  const { isAuthenticated, loading: authLoading } = useAuth()

  // BUG-4: guard against direct access / hard reload (navState lost).
  // A valid arrival must have at least `mode` and a non-empty `items` array.
  const hasValidState =
    state != null &&
    (state.mode === 'recoger' || state.mode === 'domicilio') &&
    Array.isArray(state.items) &&
    state.items.length > 0

  const mode = state?.mode === 'recoger' ? 'recoger' : 'domicilio'
  const total = state?.total ?? 0
  const items = state?.items ?? []
  // addressId: UUID of the delivery address (domicilio only). Passed to POST /api/orders.
  const addressId = state?.addressId ?? null

  // Modal visible by default when the page mounts.
  // Future: can be tied to an API response — e.g. show after POST /api/orders resolves.
  const [modalOpen, setModalOpen] = useState(true)

  // While auth resolves, render nothing (avoids flash redirect)
  if (authLoading) {
    return (
      <div className="protected-route-loading" role="status" aria-live="polite">
        <span className="sr-only">Verificando sesión…</span>
        <div className="protected-route-spinner" aria-hidden="true" />
      </div>
    )
  }

  // BUG-4: redirect to start of ordering flow if state is missing or invalid
  if (!hasValidState) {
    return <Navigate to="/hacer-pedido" replace />
  }

  // Require authentication for all order confirmation steps (GAP-5 already
  // prevents reaching here without a session, but keep this as a safety net).
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: '/hacer-pedido/confirmar' }}
      />
    )
  }

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
            {items.map((it, index) => {
              // Support both new shape (unitPrice/lineTotal/options) and legacy shape (price)
              const unitPrice = it.unitPrice ?? it.price ?? 0
              const lineTotal = it.lineTotal ?? unitPrice * it.quantity
              const options = it.options ?? []
              const removedIngredients = it.removedIngredients ?? []
              const notes = it.notes ?? ''
              const hasCustom = options.length > 0 || removedIngredients.length > 0 || !!notes

              // Use the cart key when available, otherwise fall back to index
              const lineKey = it.key ?? `${it.id}-${index}`

              return (
                <li key={lineKey} className="confirm-list-item">
                  <div className="confirm-list-item-row">
                    <span className="confirm-item-label">{it.quantity}× {it.name}</span>
                    <span className="confirm-item-price">
                      {lineTotal.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  {hasCustom && (
                    <ul className="confirm-item-custom" aria-label={`Personalització de ${it.name}`}>
                      {options.map(({ groupLabel, choiceLabel }) => (
                        <li key={groupLabel} className="confirm-item-custom-row">
                          <span className="confirm-item-custom-label">{groupLabel}:</span>{' '}
                          {choiceLabel}
                        </li>
                      ))}
                      {removedIngredients.length > 0 && (
                        <li className="confirm-item-custom-row">
                          <span className="confirm-item-custom-label">Sin:</span>{' '}
                          {removedIngredients.join(', ')}
                        </li>
                      )}
                      {notes && (
                        <li className="confirm-item-custom-row">
                          <span className="confirm-item-custom-label">Nota:</span>{' '}
                          &ldquo;{notes}&rdquo;
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              )
            })}
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
