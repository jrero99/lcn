import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { registerRequest } from '../services/authService.js'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'

// Registration page — /registro
// Wired to POST /api/auth/register. On success the backend sets the httpOnly
// session cookie (auto-login); we hydrate React state via login() and show the
// welcome modal before going home.
//
// Google SSO: uses the same GoogleSignInButton as Login.jsx. The backend
// performs find-or-create, so it works for both new and returning users.
//
// SECURITY: passwords are sent once to the server and never logged or stored.
export default function Registro() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telefono, setTelefono] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Checkboxes
  const [mayoria, setMayoria] = useState(false)        // optional
  const [condiciones, setCondiciones] = useState(false) // required
  const [privacidad, setPrivacidad] = useState(false)   // required
  const [comerciales, setComeriales] = useState(false)  // optional

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
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
    if (!password) {
      next.password = 'Introduce una contraseña'
    } else if (password.length < 8) {
      next.password = 'La contraseña debe tener al menos 8 caracteres'
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

  async function handleSubmit(e) {
    e.preventDefault()
    setServerError('')

    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      // POST /api/auth/register — sets the httpOnly cookie (auto-login) on success.
      // NEVER log personal data or passwords.
      await registerRequest({
        name: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        password,
        phone: telefono.trim(),
        consentConditions: condiciones,
        consentPrivacy: privacidad,
        consentMarketing: comerciales,
      })

      // The server already issued the session cookie; hydrate React state from
      // GET /api/auth/me (single source of truth) before showing the welcome.
      await login()

      setWelcomeOpen(true)
    } catch (err) {
      // Show the server message (e.g. "El email ya está registrado").
      setServerError(err.message || 'No se ha podido crear la cuenta. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleWelcomeClose() {
    setWelcomeOpen(false)
    // The user is already logged in (cookie set on register) — go home.
    navigate('/', { replace: true })
  }

  // Called by GoogleSignInButton after a successful Google sign-in/sign-up.
  // The backend has already set the session cookie; we hydrate React state
  // and go home. No welcome modal needed — the backend did find-or-create.
  async function handleGoogleSuccess() {
    await login()
    navigate('/', { replace: true })
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

        {/* Server-level error (email/password or Google SSO) */}
        {serverError && (
          <p className="field-error" role="alert" style={{ marginBottom: '1rem' }}>
            {serverError}
          </p>
        )}

        {/* Google SSO — shown when VITE_GOOGLE_CLIENT_ID is configured */}
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={setServerError}
        />

        {/* "o" separator between Google button and email/password form */}
        <div className="auth-sso-separator" role="separator" aria-label="o">
          <span>o</span>
        </div>

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

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="sr-only">Contraseña</label>
              <div className="address-field" aria-describedby={errors.password ? 'reg-password-error' : undefined}>
                <LockIcon />
                <input
                  id="reg-password"
                  type="password"
                  placeholder="Contraseña (mín. 8 caracteres)"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                  aria-describedby={errors.password ? 'reg-password-error' : undefined}
                  disabled={submitting}
                />
              </div>
              {errors.password && (
                <p id="reg-password-error" className="field-error" role="alert">
                  {errors.password}
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

          <button type="submit" className="btn-continue" disabled={submitting}>
            {submitting ? 'Creando cuenta…' : 'Crea tu cuenta ahora'}
          </button>
        </form>

        {/* Divider + login CTA */}
        <div className="auth-divider" role="separator" aria-hidden="true" />
        <p className="auth-switch-text">¿Ya tienes cuenta?</p>
        <Link to="/login" className="btn-block-dark">
          Identifícate
        </Link>
      </div>

      {/* Welcome modal — shown after a successful registration (user is logged in) */}
      <Modal
        isOpen={welcomeOpen}
        onClose={handleWelcomeClose}
        title="¡Bienvenido/a!"
        message="Tu cuenta se ha creado correctamente y ya has iniciado sesión. ¡Disfruta de todos nuestros servicios!"
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

function LockIcon() {
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
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}
