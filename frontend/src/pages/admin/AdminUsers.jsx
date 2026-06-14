import { useState, useEffect, useCallback } from 'react'
import { fetchAdminUsers, fetchUserAddresses } from '../../services/adminService.js'

// RGPD NOTE:
// User data displayed here (email, phone, name) is personal data.
// - Never log it to the console.
// - Display only what is operationally necessary.
// - Data is fetched from the server on demand; it is never cached in
//   localStorage or sessionStorage.

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Selected user for address drill-down
  const [selectedUser, setSelectedUser] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrError, setAddrError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchAdminUsers({ page, limit: 20 })
      .then((res) => {
        setUsers(res.data ?? [])
        setPagination(res.pagination ?? null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  function handleSelectUser(user) {
    if (selectedUser?.id === user.id) {
      // Toggle off
      setSelectedUser(null)
      setAddresses([])
      return
    }
    setSelectedUser(user)
    setAddresses([])
    setAddrError(null)
    setAddrLoading(true)

    fetchUserAddresses(user.id)
      .then((res) => {
        // res may be { addresses: [] } or directly []
        const list = Array.isArray(res) ? res : (res?.addresses ?? [])
        setAddresses(list)
      })
      .catch((err) => {
        // RGPD: do not include user identifier in error log
        setAddrError(err.message || 'Error al cargar las direcciones.')
      })
      .finally(() => setAddrLoading(false))
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Usuarios</h2>
        {pagination && (
          <span className="admin-section-count">{pagination.total} usuarios registrados</span>
        )}
      </div>

      {loading && <p className="admin-status-msg">Cargando usuarios…</p>}
      {error && (
        <div className="admin-status-msg admin-status-msg--error" role="alert">
          <span>{error}</span>
          <button className="admin-retry-btn" onClick={load}>Reintentar</button>
        </div>
      )}
      {!loading && !error && users.length === 0 && (
        <p className="admin-status-msg">No hay usuarios registrados todavía.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Tabla de usuarios">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Email</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Registrado</th>
                <th scope="col">Direcciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <>
                  <tr
                    key={user.id}
                    className={selectedUser?.id === user.id ? 'admin-row--selected' : ''}
                  >
                    <td>{user.firstName} {user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{user.phone ?? '—'}</td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString('es-ES', { dateStyle: 'short' })}
                    </td>
                    <td>
                      <button
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => handleSelectUser(user)}
                        aria-expanded={selectedUser?.id === user.id}
                        aria-controls={`addr-${user.id}`}
                      >
                        {selectedUser?.id === user.id ? 'Ocultar' : 'Ver'}
                      </button>
                    </td>
                  </tr>

                  {/* Inline address drawer */}
                  {selectedUser?.id === user.id && (
                    <tr key={`addr-${user.id}`} id={`addr-${user.id}`}>
                      <td colSpan={5} className="admin-addr-drawer">
                        {addrLoading && <span className="admin-status-msg">Cargando direcciones…</span>}
                        {addrError && <span className="field-error" role="alert">{addrError}</span>}
                        {!addrLoading && !addrError && addresses.length === 0 && (
                          <span className="admin-empty-hint">Sin direcciones guardadas.</span>
                        )}
                        {!addrLoading && !addrError && addresses.length > 0 && (
                          <ul className="admin-addr-list">
                            {addresses.map((addr, i) => (
                              <li key={addr.id ?? i} className="admin-addr-item">
                                {addr.street}
                                {addr.city ? `, ${addr.city}` : ''}
                                {addr.postalCode ? ` (${addr.postalCode})` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="admin-pagination">
          <button
            className="admin-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="admin-page-info">Página {page} de {pagination.totalPages}</span>
          <button
            className="admin-page-btn"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
