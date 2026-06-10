import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '../components/Modal.jsx'

// Registration page — /registro
// Auth is mock only. Integration point: TODO POST /api/auth/register
export default function Registro() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')

  // Checkboxes
  const [mayoria, setMayoria] = useState(false)        // optional
  const [condiciones, setCondiciones] = useState(false) // required
  const [privacidad, setPrivacidad] = useState(false)   // required
  const [comerciales, setComeriales] = useState(false)  // optional

  const [errors, setErrors] = useState({})
  const [welcomeOpen, setWelcomeOpen] = useState(false)

  function validate() {
    const next = {}
    if (!nombre.trim()) next.nombre = 'Introduce tu nombre'
    if (!apellidos.trim()) next.apellidos = 'Introduce tus apellidos'
    if (!email.trim()) {
      next.email = 'Introduce tu correo electrónico'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'El correo no tiene un formato válido'
    }
    if (!telefono.trim()) {
      next.telefono = 'Introduce tu número de teléfono'
    } else if (!/^[+\d\s\-()]{7,}$/.test(telefono.trim())) {
      next.telefono = 'Introduce un número de teléfono válido'
    }
    if (!condiciones) next.condiciones = 'Debes aceptar las condiciones de venta'
    if (!privacidad) next.privacidad = 'Debes aceptar la política de protección de datos'
    return next
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // TODO: replace mock with POST /api/auth/register
    // Body: { nombre, apellidos, email, telefono, aceptaCondiciones: true, aceptaPrivacidad: true, aceptaComunicaciones: comerciales }
    // NEVER log personal data or passwords
    console.info('[Registro] Mock submit OK')

    setWelcomeOpen(true)
  }

  function handleWelcomeClose() {
    setWelcomeOpen(false)
    // Navigate to login after closing the welcome modal
    navigate('/login')
  }

  function clearError(field) {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  return (
    <section className="datos">
      <div className="auth-inner">
        <h1 className="datos-title">Regístrate</h1>
        <p className="datos-sub">Introduce tu correo electrónico</p>

        <form className="datos-form auth-form" onSubmit={handleSubmit} noValidate>
          {/* 2-column grid for personal data fields */}
          <div className="auth-fields-grid">
            {/* Nombre */}
            <div>
              <label htmlFor="reg-nombre" className="sr-only">Nombre</label>
              <div className="address-field" aria-describedby={errors.nombre ? 'reg-nombre-error' : undefined}>
                <PersonIcon />
                <input
                  id="reg-nombre"
                  type="text"
                  placeholder="Nombre"
                  autoComplete="given-name"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); clearError('nombre') }}
                  aria-describedby={errors.nombre ? 'reg-nombre-error' : undefined}
                />
              </div>
              {errors.nombre && (
                <p id="reg-nombre-error" className="field-error" role="alert">
                  {errors.nombre}
                </p>
              )}
            </div>

            {/* Apellidos */}
            <div>
              <label htmlFor="reg-apellidos" className="sr-only">Apellidos</label>
              <div className="address-field" aria-describedby={errors.apellidos ? 'reg-apellidos-error' : undefined}>
                <PersonIcon />
                <input
                  id="reg-apellidos"
                  type="text"
                  placeholder="Apellidos"
                  autoComplete="family-name"
                  value={apellidos}
                  onChange={(e) => { setApellidos(e.target.value); clearError('apellidos') }}
                  aria-describedby={errors.apellidos ? 'reg-apellidos-error' : undefined}
                />
              </div>
              {errors.apellidos && (
                <p id="reg-apellidos-error" className="field-error" role="alert">
                  {errors.apellidos}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="sr-only">Correo electrónico</label>
              <div className="address-field" aria-describedby={errors.email ? 'reg-email-error' : undefined}>
                <EnvelopeIcon />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="Correo electrónico"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError('email') }}
                  aria-describedby={errors.email ? 'reg-email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="reg-email-error" className="field-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="reg-telefono" className="sr-only">Número de teléfono</label>
              <div className="address-field" aria-describedby={errors.telefono ? 'reg-telefono-error' : undefined}>
                <PhoneIcon />
                <input
                  id="reg-telefono"
                  type="tel"
                  inputMode="tel"
                  placeholder="Número de teléfono"
                  autoComplete="tel"
                  value={telefono}
                  onChange={(e) => { setTelefono(e.target.value); clearError('telefono') }}
                  aria-describedby={errors.telefono ? 'reg-telefono-error' : undefined}
                />
              </div>
              {errors.telefono && (
                <p id="reg-telefono-error" className="field-error" role="alert">
                  {errors.telefono}
                </p>
              )}
            </div>
          </div>

          {/* Checkboxes */}
          <fieldset className="datos-group auth-checkboxes">
            <legend className="sr-only">Consentimientos y condiciones</legend>

            {/* Mayor de 18 años — optional */}
            <label className="check-option">
              <input
                type="checkbox"
                checked={mayoria}
                onChange={(e) => setMayoria(e.target.checked)}
              />
              <span className="check-box" aria-hidden="true" />
              <span className="check-label">Soy mayor de 18 años</span>
            </label>

            {/* Condiciones de venta — required */}
            <div>
              <label className="check-option" aria-describedby={errors.condiciones ? 'reg-condiciones-error' : undefined}>
                <input
                  type="checkbox"
                  checked={condiciones}
                  onChange={(e) => { setCondiciones(e.target.checked); clearError('condiciones') }}
                  aria-describedby={errors.condiciones ? 'reg-condiciones-error' : undefined}
                />
                <span className="check-box" aria-hidden="true" />
                <span className="check-label">
                  Acepto las condiciones de venta
                  <span className="check-hint-inline"> (Casilla obligatoria)</span>
                </span>
              </label>
              {errors.condiciones && (
                <p id="reg-condiciones-error" className="field-error" role="alert">
                  {errors.condiciones}
                </p>
              )}
            </div>

            {/* Política de protección de datos — required */}
            <div>
              <label className="check-option" aria-describedby={errors.privacidad ? 'reg-privacidad-error' : undefined}>
                <input
                  type="checkbox"
                  checked={privacidad}
                  onChange={(e) => { setPrivacidad(e.target.checked); clearError('privacidad') }}
                  aria-describedby={errors.privacidad ? 'reg-privacidad-error' : undefined}
                />
                <span className="check-box" aria-hidden="true" />
                <span className="check-label">
                  Acepto la{' '}
                  <Link to="/politica-privacidad">política de protección de datos personales</Link>
                  <span className="check-hint-inline"> (Casilla obligatoria)</span>
                </span>
              </label>
              {errors.privacidad && (
                <p id="reg-privacidad-error" className="field-error" role="alert">
                  {errors.privacidad}
                </p>
              )}
            </div>

            {/* Comunicaciones comerciales — optional */}
            <label className="check-option">
              <input
                type="checkbox"
                checked={comerciales}
                onChange={(e) => setComeriales(e.target.checked)}
              />
              <span className="check-box" aria-hidden="true" />
              <span className="check-label">
                Acepto recibir comunicaciones electrónicas comerciales de la marca
              </span>
            </label>
          </fieldset>

          <button type="submit" className="btn-continue">Crea tu cuenta ahora</button>
        </form>

        {/* Divider + login CTA */}
        <div className="auth-divider" role="separator" aria-hidden="true" />
        <p className="auth-switch-text">¿Ya tienes cuenta?</p>
        <Link to="/login" className="btn-block-dark">
          Identifícate
        </Link>
      </div>

      {/* Welcome modal — shown on successful mock registration */}
      <Modal
        isOpen={welcomeOpen}
        onClose={handleWelcomeClose}
        title="¡Bienvenido/a!"
        message="Tu cuenta se ha creado correctamente. Ya puedes iniciar sesión y disfrutar de todos nuestros servicios."
      />
    </section>
  )
}

// ── Inline SVG icons (decorative, aria-hidden) ────────────────────────────────

function PersonIcon() {
  return (
    <svg
      className="pin-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg
      className="pin-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      className="pin-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.6 10.8a15.04 15.04 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.61 21 3 14.39 3 6.25A1 1 0 0 1 4 5.25h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02L6.6 10.8z" />
    </svg>
  )
}
