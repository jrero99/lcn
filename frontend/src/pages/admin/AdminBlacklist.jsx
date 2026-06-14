import { useState, useEffect, useCallback } from 'react'
import Modal from '../../components/Modal.jsx'
import {
  fetchBlacklist,
  addBlacklistEntry,
  deleteBlacklistEntry,
} from '../../services/adminService.js'

const TYPE_LABELS = {
  phone: 'Teléfono',
  address: 'Dirección',
  email: 'Email',
  ip: 'IP',
}

const EMPTY_FORM = { type: 'phone', value: '', reason: '', expiresAt: '' }

export default function AdminBlacklist() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add entry form modal
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchBlacklist()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        setEntries(list)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormError('')
    setAddOpen(true)
  }

  async function handleAddSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.value.trim()) { setFormError('El valor es obligatorio.'); return }
    if (!form.reason.trim()) { setFormError('El motivo es obligatorio.'); return }

    setFormLoading(true)
    try {
      const body = {
        type: form.type,
        value: form.value.trim(),
        reason: form.reason.trim(),
        expiresAt: form.expiresAt || undefined,
      }
      await addBlacklistEntry(body)
      setAddOpen(false)
      load()
    } catch (err) {
      setFormError(err.message || 'Error al añadir la entrada.')
    } finally {
      setFormLoading(false)
    }
  }

  function openDelete(entry) {
    setDeleteTarget(entry)
    setDeleteError('')
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteBlacklistEntry(deleteTarget.id)
      setDeleteOpen(false)
      load()
    } catch (err) {
      setDeleteError(err.message || 'Error al eliminar la entrada.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Lista negra</h2>
        <button className="admin-btn admin-btn--primary" onClick={openAdd}>
          + Añadir entrada
        </button>
      </div>

      {loading && <p className="admin-status-msg">Cargando lista negra…</p>}
      {error && (
        <div className="admin-status-msg admin-status-msg--error" role="alert">
          <span>{error}</span>
          <button className="admin-retry-btn" onClick={load}>Reintentar</button>
        </div>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="admin-status-msg">La lista negra está vacía.</p>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Tabla de lista negra">
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Valor</th>
                <th scope="col">Motivo</th>
                <th scope="col">Expira</th>
                <th scope="col">Añadido</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isExpired = entry.expiresAt && new Date(entry.expiresAt) < new Date()
                return (
                  <tr key={entry.id} className={isExpired ? 'admin-row--unavailable' : ''}>
                    <td>
                      <span className="admin-bl-type-badge">
                        {TYPE_LABELS[entry.type] ?? entry.type}
                      </span>
                    </td>
                    <td className="admin-bl-value">{entry.value}</td>
                    <td>{entry.reason}</td>
                    <td>
                      {entry.expiresAt
                        ? new Date(entry.expiresAt).toLocaleDateString('es-ES', { dateStyle: 'short' })
                        : '—'}
                      {isExpired && <span className="admin-expired-tag"> (caducada)</span>}
                    </td>
                    <td>
                      {new Date(entry.createdAt).toLocaleDateString('es-ES', { dateStyle: 'short' })}
                    </td>
                    <td>
                      <button
                        className="admin-btn admin-btn--danger admin-btn--sm"
                        onClick={() => openDelete(entry)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add entry modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Añadir a lista negra"
        message={null}
      >
        <form className="admin-modal-body" onSubmit={handleAddSubmit} noValidate>
          <label className="admin-modal-label" htmlFor="bl-type">Tipo</label>
          <select
            id="bl-type"
            className="admin-filter-select"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <label className="admin-modal-label" htmlFor="bl-value">
            Valor <span aria-hidden="true">*</span>
          </label>
          <input
            id="bl-value"
            className="admin-modal-input"
            type="text"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            placeholder="Teléfono, email, IP…"
            required
          />

          <label className="admin-modal-label" htmlFor="bl-reason">
            Motivo <span aria-hidden="true">*</span>
          </label>
          <input
            id="bl-reason"
            className="admin-modal-input"
            type="text"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Razón del bloqueo"
            required
          />

          <label className="admin-modal-label" htmlFor="bl-expires">
            Fecha de expiración (opcional — máx. 1 año por RGPD)
          </label>
          <input
            id="bl-expires"
            className="admin-modal-input"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
          />

          {formError && <p className="field-error" role="alert">{formError}</p>}

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setAddOpen(false)}
              disabled={formLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={formLoading}
            >
              {formLoading ? 'Guardando…' : 'Añadir'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar de lista negra"
        message={null}
      >
        <div className="admin-modal-body">
          {deleteTarget && (
            <>
              <p className="admin-modal-text">
                ¿Eliminar la entrada <strong>{deleteTarget.value}</strong> ({TYPE_LABELS[deleteTarget.type]})?
              </p>
              {deleteError && <p className="field-error" role="alert">{deleteError}</p>}
              <div className="admin-modal-actions">
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  className="admin-btn admin-btn--danger"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
