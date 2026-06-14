import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import AdminOrders from './admin/AdminOrders.jsx'
import AdminCatalog from './admin/AdminCatalog.jsx'
import AdminUsers from './admin/AdminUsers.jsx'
import AdminBlacklist from './admin/AdminBlacklist.jsx'

// AdminOffice — backoffice panel for La Casa Nostra.
//
// Accessible at /adminoffice. Protected by ProtectedRoute (requireAdmin=true).
//
// SECURITY NOTE:
//   Access control here is UX only. Every admin API call is validated
//   server-side by the `requireAdmin` middleware. This panel is intentionally
//   NOT linked from any public page — the admin reaches it by direct URL.

const TABS = [
  { id: 'orders',    label: 'Pedidos' },
  { id: 'catalog',   label: 'Catálogo' },
  { id: 'users',     label: 'Usuarios' },
  { id: 'blacklist', label: 'Lista negra' },
]

export default function AdminOffice() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('orders')

  async function handleLogout() {
    await logout()
    // After logout the ProtectedRoute wrapper will redirect to /login
  }

  return (
    <div className="admin-office">
      {/* Sidebar */}
      <aside className="admin-sidebar" aria-label="Panel de administración">
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-title">La Casa Nostra</span>
          <span className="admin-sidebar-sub">Backoffice</span>
        </div>

        <nav aria-label="Secciones del panel">
          <ul className="admin-nav-list">
            {TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  className={`admin-nav-btn ${activeTab === tab.id ? 'admin-nav-btn--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-sidebar-footer">
          <p className="admin-sidebar-user" title={user?.email ?? ''}>
            {user?.firstName ?? user?.email ?? 'Admin'}
          </p>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main" id="admin-main-content">
        {/* Mobile tab bar (shown instead of sidebar on small screens) */}
        <div className="admin-mobile-tabs" role="tablist" aria-label="Secciones">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`admin-mobile-tab ${activeTab === tab.id ? 'admin-mobile-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section panels */}
        {activeTab === 'orders'    && <AdminOrders />}
        {activeTab === 'catalog'   && <AdminCatalog />}
        {activeTab === 'users'     && <AdminUsers />}
        {activeTab === 'blacklist' && <AdminBlacklist />}
      </main>
    </div>
  )
}
