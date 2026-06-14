import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Login page — /login
// Auth is mock only. Integration point: TODO POST /api/auth/login
export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})

  function validate() {
    const next = {}
    if (!email.trim()) {
      next.email = 'Introduce tu correo electrónico'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'El correo no tiene un formato válido'
    }
    if (!password) {
      next.password = 'Introduce tu contraseña'
    }
    return next
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // TODO: replace mock with POST /api/auth/login
    // Body: { email, password }
    // On success: the real token (JWT) should be stored in an httpOnly cookie
    // (coordinate with security-expert). Only non-sensitive user data (email,
    // display name) should be passed to login() below.
    // NEVER log password or personal data.
    console.info('[Login] Mock submit — email:', email)

    // Mark the user as authenticated in the UI context (mock only — see AuthContext.jsx).
    // Replace with real user data from the API response when the backend exists.
    login({ email })

    navigate('/')
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
        <h1 className="datos-title">Identifícate</h1>
        <p className="datos-sub">Introduce tu correo electrónico</p>

        <form className="datos-form auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email field */}
          <div>
            <label htmlFor="login-email" className="sr-only">
              Correo electrónico
            </label>
            <div className="address-field" aria-describedby={errors.email ? 'login-email-error' : undefined}>
              <EnvelopeIcon />
              <input
                id="login-email"
                type="email"
                placeholder="Tu correo"
                autoComplete="username"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError('email') }}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
              />
            </div>
            {errors.email && (
              <p id="login-email-error" className="field-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="login-password" className="sr-only">
              Contraseña
            </label>
            <div className="address-field" aria-describedby={errors.password ? 'login-password-error' : undefined}>
              <LockIcon />
              <input
                id="login-password"
                type="password"
                placeholder="Contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
              />
            </div>
            {errors.password && (
              <p id="login-password-error" className="field-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <button type="submit" className="btn-continue">Siguiente</button>
        </form>

        {/* Divider + register CTA */}
        <div className="auth-divider" role="separator" aria-hidden="true" />
        <p className="auth-switch-text">¿Aún no tienes cuenta?</p>
        <Link to="/registro" className="btn-block-dark">
          Regístrate
        </Link>
      </div>
    </section>
  )
}

// ── Inline SVG icons (decorative, aria-hidden) ────────────────────────────────

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
