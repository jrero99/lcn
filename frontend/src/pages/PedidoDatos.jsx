// PedidoDatos — paso "Introduce tus datos" del flujo de pedido.
//
// El modo ("recoger" | "domicilio") llega por query param (?mode=...).
//
// LÓGICA DE DIRECCIÓN:
//  - Modo "recoger": NO se pide dirección.
//  - Modo "domicilio":
//      · Si no hay sesión activa → redirige a /login con state.from preservado.
//      · Si hay sesión → carga las direcciones del usuario vía GET /api/addresses
//        (delegado a <AddressManager>).
//      · El usuario selecciona una dirección existente o crea una nueva.
//      · El botón "Continuar" queda bloqueado hasta que haya una dirección seleccionada.
//      · PROHIBIDO rellenar direcciones automáticamente (sin geolocalización).
//
// ESTADO QUE SE PROPAGA:
//   navigate('/hacer-pedido/{mode}', { state: { addressId, timing, age } })
//   El campo `address` (texto libre anterior) se sustituye por `addressId` (UUID).
//   En modo recoger, addressId = null.

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AddressManager from '../components/AddressManager.jsx'
import { formatAddress } from '../services/addressService.js'

export default function PedidoDatos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'domicilio' ? 'domicilio' : 'recoger'

  const { isAuthenticated, loading: authLoading } = useAuth()

  // For domicilio: the selected address UUID and its formatted label
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [selectedAddressLabel, setSelectedAddressLabel] = useState('')

  const [timing, setTiming] = useState('') // 'programar' | 'asap'
  const [age, setAge] = useState('') // 'yes' | 'no'
  const [errors, setErrors] = useState({})

  const whenQuestion =
    mode === 'domicilio' ? '¿Cuándo quieres recibirlo?' : '¿Cuándo quieres recogerlo?'

  // While auth is resolving, show nothing to avoid flash
  if (authLoading) {
    return (
      <div className="protected-route-loading" role="status" aria-live="polite">
        <span className="sr-only">Verificando sesión…</span>
        <div className="protected-route-spinner" aria-hidden="true" />
      </div>
    )
  }

  // For domicilio: require authentication.
  // Redirect to login preserving the current path so the user can come back.
  if (mode === 'domicilio' && !isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `/hacer-pedido/datos?mode=domicilio` }}
      />
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (mode === 'domicilio' && !selectedAddressId) {
      next.address = 'Selecciona o añade una dirección de entrega antes de continuar.'
    }
    if (!timing) next.timing = 'Elige cuándo lo quieres'
    if (!age) next.age = 'Indícanos tu edad'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    // Siguiente paso: el catálogo de productos.
    // Se pasa addressId (uuid | null) en lugar del texto libre anterior.
    // También se pasa addressLabel para que el CheckoutBar muestre la dirección.
    navigate(`/hacer-pedido/${mode}`, {
      state: {
        addressId: mode === 'domicilio' ? selectedAddressId : null,
        addressLabel: mode === 'domicilio' ? selectedAddressLabel : null,
        timing,
        age,
      },
    })
  }

  return (
    <section className="datos">
      <h1 className="datos-title">Introduce tus datos</h1>
      <p className="datos-sub">
        {mode === 'domicilio'
          ? 'Elige o añade la dirección de entrega'
          : 'Dinos cuándo quieres pasar a recoger tu pedido'}
      </p>

      <form className="datos-form" onSubmit={handleSubmit} noValidate>

        {/* ── Dirección (solo para domicilio) ──────────────────────────────── */}
        {mode === 'domicilio' && (
          <div className="datos-address-section">
            <AddressManager
              selectedId={selectedAddressId}
              onSelect={(id) => {
                setSelectedAddressId(id)
                // Clear the address error when the user selects one
                if (id && errors.address) {
                  setErrors((prev) => { const n = { ...prev }; delete n.address; return n })
                }
              }}
              onSelectAddress={(addr) => {
                // Keep a formatted label so it can be shown in the checkout bar
                setSelectedAddressLabel(
                  (addr.label ? addr.label + ' — ' : '') + formatAddress(addr)
                )
              }}
              showHeading={false}
            />
            {errors.address && (
              <p className="field-error" role="alert">{errors.address}</p>
            )}
          </div>
        )}

        <div className="datos-cols">
          {/* Cuándo */}
          <fieldset className="datos-group">
            <legend>{whenQuestion}</legend>
            <label className="check-option">
              <input
                type="radio"
                name="timing"
                checked={timing === 'programar'}
                onChange={() => setTiming('programar')}
              />
              <span className="check-box" aria-hidden />
              <span className="check-label">Programar mi pedido</span>
            </label>
            <label className="check-option">
              <input
                type="radio"
                name="timing"
                checked={timing === 'asap'}
                onChange={() => setTiming('asap')}
              />
              <span className="check-box" aria-hidden />
              <span className="check-label">Lo antes posible</span>
            </label>
            <p className="check-hint">Aproximadamente a las {estimatedReadyTime()}</p>
            {errors.timing && (
              <p className="field-error" role="alert">{errors.timing}</p>
            )}
          </fieldset>

          {/* Edad */}
          <fieldset className="datos-group">
            <legend>¿Eres mayor de 18 años?</legend>
            <label className="check-option">
              <input
                type="radio"
                name="age"
                checked={age === 'yes'}
                onChange={() => setAge('yes')}
              />
              <span className="check-box" aria-hidden />
              <span className="check-label">Sí</span>
            </label>
            <label className="check-option">
              <input
                type="radio"
                name="age"
                checked={age === 'no'}
                onChange={() => setAge('no')}
              />
              <span className="check-box" aria-hidden />
              <span className="check-label">No</span>
            </label>
            {errors.age && (
              <p className="field-error" role="alert">{errors.age}</p>
            )}
          </fieldset>
        </div>

        {/* Blocked state hint */}
        {mode === 'domicilio' && !selectedAddressId && (
          <p className="datos-address-hint" role="status">
            Selecciona o añade una dirección de entrega para poder continuar.
          </p>
        )}

        <button
          type="submit"
          className="btn-continue"
          disabled={mode === 'domicilio' && !selectedAddressId}
          aria-disabled={mode === 'domicilio' && !selectedAddressId}
        >
          Continuar
        </button>
      </form>
    </section>
  )
}

// Hora estimada "lo antes posible": ahora + 25 min, formato HH.MMh (24h).
function estimatedReadyTime() {
  const d = new Date(Date.now() + 25 * 60 * 1000)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}.${mm}h`
}
