import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// ProtectedRoute — guards routes that require authentication or a specific role.
//
// Props
// -----
// children    {node}    The route content to render if access is granted.
// requireAdmin {bool}   When true, also checks that `user.role === 'ADMIN'`.
//
// SECURITY NOTE:
//   The checks here are UX-only. A user who manually sets client-side state
//   will still be blocked at the API layer by `requireAuth` / `requireAdmin`
//   middleware on the backend. Never rely solely on this component for security.
//
// Behaviour
// ---------
// 1. While GET /api/auth/me is resolving on mount → show a loading indicator
//    (prevents a flash/premature redirect before we know the auth state).
// 2. Not authenticated → redirect to /login, preserving the current path as
//    `location.state.from` so Login.jsx can redirect back after success.
// 3. Authenticated but role is not ADMIN (when requireAdmin=true) → redirect to /
//    (or render a 403 message). The email check is intentionally NOT used here;
//    the role column in the DB is the authoritative criterion.
// 4. All checks pass → render children.

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // Step 1: wait for the auth hydration to complete (GET /api/auth/me in flight).
  if (loading) {
    return (
      <div className="protected-route-loading" role="status" aria-live="polite">
        <span className="sr-only">Verificando sesión…</span>
        <div className="protected-route-spinner" aria-hidden="true" />
      </div>
    )
  }

  // Step 2: not logged in at all.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  // Step 3: logged in but not an admin (for admin-only routes).
  // Real enforcement is `requireAdmin` middleware on the backend.
  if (requireAdmin && user?.role !== 'ADMIN') {
    return (
      <div className="protected-route-403" role="alert">
        <h2>Acceso restringido</h2>
        <p>No tienes permisos para acceder a esta sección.</p>
      </div>
    )
  }

  // Step 4: all checks pass.
  return children
}
