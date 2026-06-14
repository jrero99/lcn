// AuthContext — mock UI authentication state.
//
// IMPORTANT SECURITY NOTE:
// ========================
// This is a CLIENT-SIDE MOCK for UI gating only.
// It does NOT provide real security. Specifically:
//   - No JWT is validated here.
//   - The `isAuthenticated` flag can be set by any client-side code.
//   - Any "permission" enforced here can be bypassed by the user in DevTools.
//
// The real authentication flow (POST /api/auth/login, JWT verification,
// session management) MUST be implemented on the backend and validated
// server-side on every API request. UI gating is UX, not security.
//
// TODO (backend-node + security-expert):
//   - Implement POST /api/auth/login → returns a JWT.
//   - Store the JWT in an httpOnly cookie (preferred over sessionStorage to
//     prevent XSS token theft — coordinate with security-expert).
//   - Replace `login()` here with a real fetch call; on success, update
//     `isAuthenticated` and store only non-sensitive user info (name, email).
//   - Implement token refresh and logout (invalidate server-side session).

import { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEY = 'lcn_auth'

// Read persisted auth state from sessionStorage on initial load.
// sessionStorage is cleared when the browser tab is closed.
// We store ONLY non-sensitive data: email and display name.
// NEVER store passwords, raw JWTs, or sensitive personal data here.
function readPersistedAuth() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { isAuthenticated: false, user: null }
    const parsed = JSON.parse(raw)
    // Basic sanity check: must be a recognised shape
    if (parsed && typeof parsed.isAuthenticated === 'boolean') {
      return parsed
    }
  } catch {
    // Ignore parse errors (corrupted storage) — start unauthenticated
  }
  return { isAuthenticated: false, user: null }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(readPersistedAuth)

  // login — called after a successful mock (or future real) auth flow.
  // `userData` should contain ONLY non-sensitive info: { email, name? }.
  // NEVER pass passwords or raw tokens here.
  const login = useCallback((userData) => {
    const next = { isAuthenticated: true, user: userData }
    setAuthState(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // sessionStorage unavailable (private mode, quota, etc.) — state still
      // lives in memory for the current React tree; will reset on reload.
    }
  }, [])

  // logout — clears state and storage.
  const logout = useCallback(() => {
    const next = { isAuthenticated: false, user: null }
    setAuthState(next)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// useAuth — consume the auth context in any component.
// Returns: { isAuthenticated: bool, user: object|null, login, logout }
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return ctx
}
