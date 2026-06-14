// authService.js — service layer for auth API calls.
//
// All requests use `credentials: 'include'` so the browser sends the httpOnly
// JWT cookie automatically. The JWT NEVER touches JS land.
//
// SECURITY:
//   - Passwords are sent once to the server and forgotten immediately.
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
