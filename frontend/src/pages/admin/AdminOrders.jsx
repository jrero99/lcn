import { useState, useEffect, useCallback } from 'react'
import Modal from '../../components/Modal.jsx'
import { fetchAdminOrders, updateOrderStatus } from '../../services/adminService.js'

// Valid transitions allowed from each status.
// The backend enforces these too; this list is UX-only.
const ALL_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo',
  OUT_FOR_DELIVERY: 'En reparto',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Patch state
  const [patchTarget, setPatchTarget] = useState(null)   // { order, newStatus }
  const [patchNote, setPatchNote] = useState('')
  const [patchLoading, setPatchLoading] = useState(false)
  const [patchError, setPatchError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchAdminOrders({ status: filterStatus, page, limit: 20 })
      .then((res) => {
        setOrders(res.data ?? [])
        setPagination(res.pagination ?? null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filterStatus, page])

  useEffect(() => { load() }, [load])

  function openPatchModal(order, newStatus) {
    setPatchTarget({ order, newStatus })
    setPatchNote('')
    setPatchError('')
    setModalOpen(true)
  }

  async function confirmPatch() {
    if (!patchTarget) return
    setPatchLoading(true)
    setPatchError('')
    try {
      await updateOrderStatus(patchTarget.order.id, {
        status: patchTarget.newStatus,
        note: patchNote || undefined,
      })
      setModalOpen(false)
      load()  // refresh list
    } catch (err) {
      setPatchError(err.message || 'Error al actualizar el pedido.')
    } finally {
      setPatchLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Pedidos</h2>
        <select
          className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {loading && <p className="admin-status-msg">Cargando pedidos…</p>}
      {error && (
        <div className="admin-status-msg admin-status-msg--error" role="alert">
          <span>{error}</span>
          <button className="admin-retry-btn" onClick={load}>Reintentar</button>
        </div>
      )}
      {!loading && !error && orders.length === 0 && (
        <p className="admin-status-msg">No hay pedidos con los filtros actuales.</p>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Tabla de pedidos">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Fecha</th>
                <th scope="col">Modo</th>
                <th scope="col">Total</th>
                <th scope="col">Estado</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="admin-table-id">{order.id.slice(0, 8)}…</td>
                  <td>{new Date(order.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{order.mode === 'DELIVERY' ? 'Domicilio' : 'Recoger'}</td>
                  <td>{Number(order.total).toFixed(2)} €</td>
                  <td>
                    <span className={`admin-status-badge admin-status-badge--${order.status.toLowerCase()}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="admin-status-select"
                      value={order.status}
                      onChange={(e) => openPatchModal(order, e.target.value)}
                      aria-label={`Cambiar estado del pedido ${order.id.slice(0, 8)}`}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
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

      {/* Confirmation modal (reuses generic Modal) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Cambiar estado del pedido"
        message={null}
      >
        <div className="admin-modal-body">
          {patchTarget && (
            <>
              <p className="admin-modal-text">
                Pedido <strong>{patchTarget.order.id.slice(0, 8)}…</strong>
              </p>
              <p className="admin-modal-text">
                Nuevo estado:{' '}
                <strong>{STATUS_LABELS[patchTarget.newStatus] ?? patchTarget.newStatus}</strong>
              </p>
              <label className="admin-modal-label" htmlFor="patch-note">
                Nota interna (opcional)
              </label>
              <textarea
                id="patch-note"
                className="admin-modal-textarea"
                value={patchNote}
                onChange={(e) => setPatchNote(e.target.value)}
                placeholder="Motivo del cambio de estado…"
                rows={3}
              />
              {patchError && (
                <p className="field-error" role="alert">{patchError}</p>
              )}
              <div className="admin-modal-actions">
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={patchLoading}
                >
                  Cancelar
                </button>
                <button
                  className="admin-btn admin-btn--primary"
                  onClick={confirmPatch}
                  disabled={patchLoading}
                >
                  {patchLoading ? 'Guardando…' : 'Confirmar'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
