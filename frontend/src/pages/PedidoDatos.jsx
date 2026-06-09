import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Paso "Introduce tus datos" del flujo de pedido.
// El modo ("recoger" | "domicilio") llega por query param (?mode=...).
export default function PedidoDatos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'domicilio' ? 'domicilio' : 'recoger'

  const [address, setAddress] = useState('')
  const [timing, setTiming] = useState('') // 'programar' | 'asap'
  const [age, setAge] = useState('') // 'yes' | 'no'
  const [geoStatus, setGeoStatus] = useState('idle') // idle | locating | done | error
  const [errors, setErrors] = useState({})

  const whenQuestion =
    mode === 'domicilio' ? '¿Cuándo quieres recibirlo?' : '¿Cuándo quieres recogerlo?'

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setGeoStatus('error')
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setAddress(`Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
        setGeoStatus('done')
      },
      () => setGeoStatus('error'),
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!address.trim()) next.address = 'Indica una dirección'
    if (!timing) next.timing = 'Elige cuándo lo quieres'
    if (!age) next.age = 'Indícanos tu edad'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    // Siguiente paso: el catálogo de productos (según el modo elegido).
    navigate(`/hacer-pedido/${mode}`, { state: { address, timing, age } })
  }

  return (
    <section className="datos">
      <h1 className="datos-title">Introduce tus datos</h1>
      <p className="datos-sub">Escribe tu dirección</p>

      <form className="datos-form" onSubmit={handleSubmit} noValidate>
        <div className="address-row">
          <div className="address-field">
            <PinIcon />
            <input
              type="text"
              placeholder="Calle, número y ciudad"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              aria-label="Dirección"
            />
          </div>
          <button
            type="button"
            className="btn btn-outline btn-location"
            onClick={useMyLocation}
            disabled={geoStatus === 'locating'}
          >
            {geoStatus === 'locating' ? 'Localizando…' : 'Usar mi ubicación'}
          </button>
        </div>
        {errors.address && <p className="field-error">{errors.address}</p>}
        {geoStatus === 'error' && (
          <p className="field-error">No hemos podido obtener tu ubicación.</p>
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
            {errors.timing && <p className="field-error">{errors.timing}</p>}
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
            {errors.age && <p className="field-error">{errors.age}</p>}
          </fieldset>
        </div>

        <button type="submit" className="btn-continue">Continuar</button>
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

function PinIcon() {
  return (
    <svg className="pin-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
