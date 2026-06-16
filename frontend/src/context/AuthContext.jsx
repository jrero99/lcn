// AuthContext — authentication state backed by the real backend API.
//
// SECURITY MODEL (read before touching this file):
// ================================================
// 1. The JWT lives ONLY in an httpOnly cookie (set by the server).
//    JavaScript has zero access to it — no XSS can steal it.
// 2. This context stores ONLY non-sensitive info: { id, email, firstName,
//    lastName, role }. NEVER passwords, raw tokens, or PII beyond what is
//    listed here.
// 3. `sessionStorage` is NO LONGER USED. State is derived from `GET
//    /api/auth/me` on mount, which validates the cookie server-side.
// 4. UI gating (isAuthenticated, role checks) is UX only. Real enforcement
//    happens server-side on every API request (`requireAuth` / `requireAdmin`).
//
// Flow on page load:
//   mount → GET /api/auth/me (cookie sent automatically) →
//     200: hydrate user state
//     401: user is not authenticated
//
// login() — called after POST /api/auth/login succeeds.
//   The cookie is already set by the server response; we just fetch /me to
//   get the user object and update React state.
//
// logout() — calls POST /api/auth/logout to clear the server-side cookie,
//   then clears React state.

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getMeRequest, logoutRequest } from '../services/authService.js'
import { onUnauthorized } from '../services/sessionEvents.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // user: { id, email, firstName, lastName, role } | null
  const [user, setUser] = useState(null)
  // loading: true while GET /api/auth/me is in-flight on mount.
  // ProtectedRoute waits for this to resolve before redirecting.
  const [loading, setLoading] = useState(true)

  // On mount, resolve the current session from the server.
  useEffect(() => {
    let cancelled = false

    getMeRequest()
      .then((data) => {
        if (cancelled) return
        // data is { user: {...} } or null (401 → not authenticated)
        setUser(data?.user ?? null)
      })
      .catch(() => {
        // Network error or unexpected server error — treat as unauthenticated.
        // The user will need to log in.
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // Listen for 401 signals from any authenticated service call.
  // When any protected endpoint returns 401, the session cookie has expired
  // or been invalidated server-side. We clear user state so the UI immediately
  // reflects the logged-out status (header saludo disappears, guards redirect).
  // We do NOT call logoutRequest() here because the cookie is already invalid —
  // there is nothing to clear on the server.
  useEffect(() => {
    const cleanup = onUnauthorized(() => {
      setUser(null)
    })
    return cleanup
  }, [])

  // login — call after a successful POST /api/auth/login.
  // The httpOnly cookie is already set by the server at this point.
  // We re-fetch /me so we always hydrate from a single source of truth.
  const login = useCallback(async () => {
    const data = await getMeRequest()
    // NEVER store passwords or raw tokens here.
    setUser(data?.user ?? null)
  }, [])

  // logout — clear the server-side cookie, then clear local state.
  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const isAuthenticated = Boolean(user)

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// useAuth — consume the auth context in any component.
// Returns: { isAuthenticated: bool, user: object|null, loading: bool, login, logout }
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return ctx
}
