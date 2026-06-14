import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { loginRequest } from '../services/authService.js'

// Login page — /login
//
// SECURITY:
//   - Passwords are NOT logged, stored, or passed to any state.
//   - The JWT is set by the server in an httpOnly cookie; JS never sees it.
//   - After a successful login we call login() (from AuthContext), which
//     re-fetches GET /api/auth/me to hydrate the user object.
//   - Validation here is UX only; the server re-validates everything.
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Redirect destination: honour ?next= or the state set by ProtectedRoute.
  const from = location.state?.from ?? '/'

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

  async function handleSubmit(e) {
    e.preventDefault()
    setServerError('')

    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      // POST /api/auth/login — sets httpOnly cookie on success.
      // NEVER pass the password anywhere after this call.
      await loginRequest({ email, password })

      // Hydrate user state from GET /api/auth/me (single source of truth).
      await login()

      // Navigate to the protected page the user came from, or home.
      navigate(from, { replace: true })
    } catch (err) {
      // Show the server error message (e.g. "Credenciales incorrectas").
      // NEVER log email/password to the console.
      setServerError(err.message || 'Error al iniciar sesión. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
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

        {/* Server-level error (e.g. wrong credentials) */}
        {serverError && (
          <p className="field-error" role="alert" style={{ marginBottom: '1rem' }}>
            {serverError}
          </p>
        )}

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
                disabled={submitting}
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
                disabled={submitting}
              />
            </div>
            {errors.password && (
              <p id="login-password-error" className="field-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <button type="submit" className="btn-continue" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Siguiente'}
          </button>
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
