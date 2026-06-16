import { useState, useRef } from 'react'
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/Modal.jsx'
import { createOrder } from '../services/orderService.js'

// Cierre del flujo de pedido. El pago es contra reembolso (tarjeta o efectivo
// al repartidor), así que aquí no hay cobro online: solo confirmación.
//
// Flujo:
//   1. El usuario revisa el resumen del pedido (items, total estimado).
//   2. El usuario revisa/edita el teléfono de contacto para este pedido.
//   3. Pulsa "Confirmar pedido" → se llama a POST /api/orders.
//   4. Mientras el POST está en vuelo, el botón queda deshabilitado.
//   5. Éxito (201): se muestra el Modal de confirmación con el título/mensaje
//      que devuelva el servidor (o defaults si no vienen). Al cerrar el modal,
//      el carrito se considera limpio y se redirige al inicio.
//   6. Error: se muestra un bloque de error reutilizando el Modal genérico.
//      El mismo `idempotencyKey` se reutiliza en reintentos para que el servidor
//      deduplique si el primer intento llegó pero la respuesta se perdió.
//
// Campos enviados a POST /api/orders:
//   idempotencyKey, mode (PICKUP|DELIVERY), paymentMethod (CARD|CASH),
//   timing (ASAP|SCHEDULED), contactPhone, items[], addressId? (DELIVERY only)
//
// El total NUNCA se envía al servidor: el backend lo recalcula.
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

// Validates a Spanish phone number (mobile or landline).
// Accepts: optional +34 prefix, then 9 digits starting with 6, 7, 8, or 9.
// Examples: "612345678", "+34912345678", "93 123 45 67" (spaces/dashes stripped).
// This mirrors the libphonenumber-js ES validation used by the backend validator.
function isValidSpanishPhone(value) {
  const normalized = value.replace(/[\s\-().]/g, '')
  return /^(\+34)?[6789]\d{8}$/.test(normalized)
}

export default function OrderConfirmation() {
  const { state } = useLocation()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const navigate = useNavigate()

  // BUG-4: guard against direct access / hard reload (navState lost).
  // A valid arrival must have at least `mode` and a non-empty `items` array.
  const hasValidState =
    state != null &&
    (state.mode === 'recoger' || state.mode === 'domicilio') &&
    Array.isArray(state.items) &&
    state.items.length > 0

  const mode = state?.mode === 'recoger' ? 'recoger' : 'domicilio'
  const timing = state?.timing ?? 'asap'        // 'asap' | 'programar'
  const total = state?.total ?? 0
  const items = state?.items ?? []
  const addressId = state?.addressId ?? null    // UUID for DELIVERY, null for PICKUP
  const addressLabel = state?.addressLabel ?? null

  // paymentMethod: default CASH (the most common, since it's contra reembolso).
  // In a future iteration the user could choose CARD or CASH here.
  const paymentMethod = 'CASH'

  // Idempotency key — one per order attempt; reused on retries (network errors).
  // useRef so it survives re-renders without regenerating.
  const idempotencyKeyRef = useRef(null)
  if (idempotencyKeyRef.current === null) {
    idempotencyKeyRef.current = crypto.randomUUID()
  }

  // contactPhone field: pre-filled with user's profile phone (if any), editable.
  // The user can change it to use a different number just for this order.
  // Google SSO users who have no phone can type it here instead of going to profile.
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '')
  const [phoneError, setPhoneError] = useState('')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)  // true after 201 success

  // Modal: used for both success confirmation and error reporting.
  // successData holds the optional title/message from the server response.
  const [successData, setSuccessData] = useState(null)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

  // Map cart items to the shape the orderService/validator expects.
  // Each item: { productId, quantity, selectedOptions?, removedIngredients?, notes? }
  function buildOrderItems() {
    return items.map((it) => {
      const line = {
        productId: it.id,
        quantity: it.quantity,
      }
      // selectedOptions: cart stores [{ groupLabel, choiceLabel }] for display;
      // the orderService needs { [groupId]: choiceId }. The cart shape from
      // OrderCatalog already stores selectedOptions as { [groupId]: choiceId }
      // on the item before building display labels. Pass it through.
      if (it.selectedOptions && Object.keys(it.selectedOptions).length > 0) {
        line.selectedOptions = it.selectedOptions
      }
      if (it.removedIngredients && it.removedIngredients.length > 0) {
        line.removedIngredients = it.removedIngredients
      }
      if (it.notes) line.notes = it.notes
      return line
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting || submitted) return

    // Client-side phone validation: required and must be a valid Spanish phone.
    const trimmedPhone = contactPhone.trim()
    if (!trimmedPhone) {
      setPhoneError('Introduce un número de teléfono para que podamos contactarte.')
      return
    }
    if (!isValidSpanishPhone(trimmedPhone)) {
      setPhoneError('Introduce un número de teléfono español válido (p. ej. 612 345 678 o +34 912 345 678).')
      return
    }
    setPhoneError('')

    setSubmitting(true)
    setErrorMsg('')

    try {
      const result = await createOrder({
        idempotencyKey: idempotencyKeyRef.current,
        mode,
        paymentMethod,
        timing,
        contactPhone: trimmedPhone,
        items: buildOrderItems(),
        addressId: mode === 'domicilio' ? addressId : undefined,
      })

      // Success: record server's optional confirmation copy, mark as done
      setSuccessData({
        title: result.confirmationTitle ?? undefined,
        message: result.confirmationMessage ?? undefined,
      })
      setSubmitted(true)
    } catch (err) {
      // Network or server error — show error modal, keep key for retry
      setErrorMsg(err.message)
      setErrorModalOpen(true)
    } finally {
      setSubmitting(false)
    }
  }

  function handleSuccessClose() {
    // Cart is already gone (it lives in OrderCatalog's state, which is now
    // unmounted). Navigating away finalizes the clean state.
    navigate('/', { replace: true })
  }

  return (
    <>
      {/* ── Success confirmation modal ─────────────────────────────────────── */}
      {/* Shown after 201. Uses server copy if provided, falls back to defaults. */}
      <Modal
        isOpen={submitted}
        onClose={handleSuccessClose}
        title={successData?.title}
        message={successData?.message}
      />

      {/* ── Error modal ───────────────────────────────────────────────────── */}
      {/* Shown on submit failure. User can dismiss and retry. */}
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="No se ha podido enviar el pedido"
        message={errorMsg || 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'}
      />

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <section className="datos confirm">
        <h1 className="datos-title">Revisa tu comanda</h1>
        <p className="datos-sub">
          {mode === 'recoger'
            ? 'Podràs recollir-la al local. Pagaràs en recollir-la.'
            : `Entrega a: ${addressLabel ?? ''}. Pagaràs al repartidor en rebre-la.`}
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
              <span>Total estimat</span>
              <span>{total.toFixed(2).replace('.', ',')} €</span>
            </li>
          </ul>
        )}

        <form onSubmit={handleSubmit} className="confirm-submit-form" noValidate>
          {/* Contact phone for this order — pre-filled from profile, editable */}
          <div className="confirm-phone-field">
            <label htmlFor="confirm-contact-phone" className="confirm-phone-label">
              Teléfono de contacto
            </label>
            <input
              id="confirm-contact-phone"
              type="tel"
              className={`confirm-phone-input${phoneError ? ' confirm-phone-input--error' : ''}`}
              value={contactPhone}
              onChange={(e) => {
                setContactPhone(e.target.value)
                if (phoneError) setPhoneError('')
              }}
              placeholder="612 345 678"
              autoComplete="tel"
              aria-describedby={phoneError ? 'confirm-phone-error' : undefined}
              aria-invalid={!!phoneError}
              disabled={submitting || submitted}
            />
            {phoneError && (
              <p id="confirm-phone-error" className="field-error" role="alert">
                {phoneError}
              </p>
            )}
            <p className="confirm-phone-hint">
              Solo se usará para gestionar este pedido.
            </p>
          </div>

          <button
            type="submit"
            className="btn-continue"
            disabled={submitting || submitted}
            aria-disabled={submitting || submitted}
          >
            {submitting ? 'Enviando…' : 'Confirmar pedido'}
          </button>
        </form>

        {/* Back links — only shown while not yet submitted */}
        {!submitted && (
          <div className="confirm-actions">
            <Link className="btn btn-outline" to={`/hacer-pedido/${mode}`}>
              Modificar pedido
            </Link>
            <Link className="btn btn-outline" to="/">Volver al inicio</Link>
          </div>
        )}
      </section>
    </>
  )
}
