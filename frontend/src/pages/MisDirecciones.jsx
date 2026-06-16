// MisDirecciones — standalone account page for managing saved addresses.
//
// Accessible from the header when the user is authenticated (link "Mis direcciones").
// Requires login: redirects to /login if no active session, preserving `from`
// so the user lands back here after signing in.
//
// AddressManager is used in "pure management" mode (no onSelect / selection flow):
//   - Lists all saved addresses.
//   - Allows adding, editing, and deleting.
//   - No "Continuar" button — this page is not part of the order flow.
//
// The component is fully standalone and does not affect the order flow usage
// of AddressManager in PedidoDatos.jsx (props are optional / default null there).

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AddressManager from '../components/AddressManager.jsx'

export default function MisDirecciones() {
  const { isAuthenticated, loading: authLoading } = useAuth()

  // Show spinner while auth resolves to avoid flashing the redirect
  if (authLoading) {
    return (
      <div className="protected-route-loading" role="status" aria-live="polite">
        <span className="sr-only">Verificando sesión…</span>
        <div className="protected-route-spinner" aria-hidden="true" />
      </div>
    )
  }

  // Redirect to login, preserving the destination so the user comes back here
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: '/mis-direcciones' }}
      />
    )
  }

  return (
    <section className="datos mis-direcciones">
      <h1 className="datos-title">Mis direcciones</h1>
      <p className="datos-sub">
        Gestiona las direcciones de entrega guardadas en tu cuenta.
      </p>

      {/* AddressManager in standalone mode: no onSelect, no onSelectAddress.
          showHeading=false because the page already has its own <h1>. */}
      <div className="mis-direcciones-manager">
        <AddressManager showHeading={false} />
      </div>
    </section>
  )
}
