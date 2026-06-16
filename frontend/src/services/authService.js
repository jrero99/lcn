// authService.js — service layer for auth API calls.
//
// All requests use `credentials: 'include'` so the browser sends the httpOnly
// JWT cookie automatically. The JWT NEVER touches JS land.
//
// SECURITY:
//   - Passwords are sent once to the server and forgotten immediately.
//   - Google ID tokens (credentials) are forwarded once to the backend and
//     discarded. They are NEVER stored in JS state, localStorage or cookies.
//   - We only store non-sensitive user info (email, name, role) in React state.
//   - Never log credentials or personal data (RGPD).

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ user: { id, email, name, role } }>}
 */
export async function loginRequest({ email, password }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',       // sends / receives httpOnly cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    // Forward the error message from the server if available
    let msg = `Login failed: ${res.status}`
    try {
      const data = await res.json()
      if (data?.message) msg = data.message
      if (data?.error) msg = data.error
    } catch { /* ignore parse errors */ }
    throw new Error(msg)
  }

  return res.json()
}

/**
 * POST /api/auth/register
 * Creates a new customer account. On success the server sets the httpOnly
 * session cookie (the user is logged in immediately) and returns 201 { user }.
 *
 * @param {{
 *   name: string, apellidos: string, email: string, password: string,
 *   phone: string, consentConditions: boolean, consentPrivacy: boolean,
 *   consentMarketing?: boolean
 * }} data
 * @returns {Promise<{ user: { id, email, name } }>}
 * @throws {Error} with the server message (e.g. duplicate email, invalid phone).
 */
export async function registerRequest(data) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',       // receives the httpOnly session cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    let msg = `Registro fallido: ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) msg = body.message
      if (body?.error) msg = body.error
    } catch { /* ignore parse errors */ }
    throw new Error(msg)
  }

  return res.json()
}

/**
 * POST /api/auth/logout
 * Clears the httpOnly cookie server-side.
 * @returns {Promise<void>}
 */
export async function logoutRequest() {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  // We don't throw on failure — the local state will clear regardless.
}

/**
 * GET /api/auth/me
 * Hydrates the auth state from the server on page load.
 * @returns {Promise<{ user: { id, email, firstName, lastName, role } } | null>}
 *   Returns null if the user is not authenticated (401).
 */
export async function getMeRequest() {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    credentials: 'include',
  })

  if (res.status === 401) return null   // not authenticated — normal case

  if (!res.ok) {
    throw new Error(`GET /api/auth/me failed: ${res.status}`)
  }

  return res.json()
}

/**
 * POST /api/auth/google
 * Exchanges a Google ID token (from Google Identity Services) for a session
 * cookie. The backend verifies the token, performs find-or-create on the user,
 * and sets the same httpOnly JWT cookie as the email/password login flow.
 *
 * SECURITY:
 *   - The credential is sent to OUR backend only, not to any other party.
 *   - After this call the credential is discarded; it is never stored.
 *   - The session lives entirely in the httpOnly cookie set by the server.
 *
 * @param {string} credential  Google ID token from `response.credential`
 * @returns {Promise<{ user: { id, email, name, role } }>}
 * @throws {Error} with a user-friendly message for 401/403/422/429/503
 */
export async function googleLoginRequest(credential) {
  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    credentials: 'include',       // sets the httpOnly session cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })

  if (!res.ok) {
    let msg
    try {
      const data = await res.json()
      msg = data?.message || data?.error
    } catch { /* ignore parse errors */ }

    if (!msg) {
      switch (res.status) {
        case 401: msg = 'No se ha podido verificar tu cuenta de Google. Inténtalo de nuevo.'; break
        case 403: msg = 'Tu cuenta de Google no está verificada o ha sido desactivada.'; break
        case 422: msg = 'Datos de autenticación no válidos.'; break
        case 429: msg = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'; break
        case 503: msg = 'El inicio de sesión con Google no está disponible en este momento.'; break
        default:  msg = `Error al iniciar sesión con Google (${res.status}). Inténtalo de nuevo.`
      }
    }
    throw new Error(msg)
  }

  return res.json()
}
