import { useState, useEffect, useCallback } from 'react'
import Modal from '../../components/Modal.jsx'
import {
  fetchAdminCatalog,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../services/adminService.js'

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  available: true,
}

export default function AdminCatalog() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state (create / edit)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null) // null → create mode
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchAdminCatalog()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate(defaultCategoryId = '') {
    setEditingProduct(null)
    setForm({ ...EMPTY_FORM, categoryId: defaultCategoryId })
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(product, categoryId) {
    setEditingProduct({ ...product, categoryId })
    setForm({
      name: product.name ?? '',
      description: product.description ?? '',
      price: String(product.price ?? ''),
      categoryId,
      available: product.available ?? true,
    })
    setFormError('')
    setFormOpen(true)
  }

  function openDelete(product) {
    setDeleteTarget(product)
    setDeleteError('')
    setDeleteModalOpen(true)
  }

  async function handleFormSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return }
    const priceNum = parseFloat(form.price)
    if (isNaN(priceNum) || priceNum < 0) { setFormError('El precio debe ser un número positivo.'); return }
    if (!form.categoryId) { setFormError('Selecciona una categoría.'); return }

    setFormLoading(true)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: priceNum,
        categoryId: form.categoryId,
        available: form.available,
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, body)
      } else {
        await createProduct(body)
      }

      setFormOpen(false)
      load()
    } catch (err) {
      setFormError(err.message || 'Error al guardar el producto.')
    } finally {
      setFormLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteProduct(deleteTarget.id)
      setDeleteModalOpen(false)
      load()
    } catch (err) {
      setDeleteError(err.message || 'Error al eliminar el producto.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Catálogo</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => openCreate()}>
          + Nuevo producto
        </button>
      </div>

      {loading && <p className="admin-status-msg">Cargando catálogo…</p>}
      {error && (
        <div className="admin-status-msg admin-status-msg--error" role="alert">
          <span>{error}</span>
          <button className="admin-retry-btn" onClick={load}>Reintentar</button>
        </div>
      )}
      {!loading && !error && categories.length === 0 && (
        <p className="admin-status-msg">El catálogo está vacío.</p>
      )}

      {!loading && !error && categories.map((cat) => (
        <div key={cat.id} className="admin-catalog-category">
          <div className="admin-catalog-cat-header">
            <h3 className="admin-catalog-cat-name">{cat.label ?? cat.name}</h3>
            <button
              className="admin-btn admin-btn--secondary admin-btn--sm"
              onClick={() => openCreate(cat.id)}
            >
              + Producto en esta categoría
            </button>
          </div>

          {(cat.products ?? []).length === 0 ? (
            <p className="admin-empty-hint">Sin productos en esta categoría.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table" aria-label={`Productos de ${cat.label}`}>
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Disponible</th>
                    <th scope="col">Alérgenos</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(cat.products ?? []).map((product) => (
                    <tr key={product.id} className={product.available ? '' : 'admin-row--unavailable'}>
                      <td>
                        <strong>{product.name}</strong>
                        {product.description && (
                          <p className="admin-product-desc">{product.description}</p>
                        )}
                      </td>
                      <td>{Number(product.price).toFixed(2)} €</td>
                      <td>
                        <span className={`admin-avail-badge ${product.available ? 'admin-avail-badge--yes' : 'admin-avail-badge--no'}`}>
                          {product.available ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="admin-allergens-cell">
                        {(product.allergens ?? []).length > 0
                          ? product.allergens.map((a) => a.name ?? a).join(', ')
                          : <span className="admin-empty-hint">—</span>
                        }
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                            onClick={() => openEdit(product, cat.id)}
                          >
                            Editar
                          </button>
                          <button
                            className="admin-btn admin-btn--danger admin-btn--sm"
                            onClick={() => openDelete(product)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Create / Edit form modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
        message={null}
      >
        <form className="admin-modal-body" onSubmit={handleFormSubmit} noValidate>
          <label className="admin-modal-label" htmlFor="prod-category">
            Categoría <span aria-hidden="true">*</span>
          </label>
          <select
            id="prod-category"
            className="admin-filter-select"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            required
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label ?? cat.name}</option>
            ))}
          </select>

          <label className="admin-modal-label" htmlFor="prod-name">
            Nombre <span aria-hidden="true">*</span>
          </label>
          <input
            id="prod-name"
            className="admin-modal-input"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre del producto"
            required
          />

          <label className="admin-modal-label" htmlFor="prod-desc">
            Descripción
          </label>
          <textarea
            id="prod-desc"
            className="admin-modal-textarea"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descripción opcional"
            rows={2}
          />

          <label className="admin-modal-label" htmlFor="prod-price">
            Precio (€) <span aria-hidden="true">*</span>
          </label>
          <input
            id="prod-price"
            className="admin-modal-input"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="0.00"
            required
          />

          <label className="admin-modal-label admin-modal-label--check">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
            />
            Disponible en la carta
          </label>

          {formError && <p className="field-error" role="alert">{formError}</p>}

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setFormOpen(false)}
              disabled={formLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={formLoading}
            >
              {formLoading ? 'Guardando…' : (editingProduct ? 'Guardar cambios' : 'Crear producto')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Eliminar producto"
        message={null}
      >
        <div className="admin-modal-body">
          {deleteTarget && (
            <>
              <p className="admin-modal-text">
                ¿Eliminar <strong>{deleteTarget.name}</strong>? Esta acción no se puede deshacer.
              </p>
              {deleteError && <p className="field-error" role="alert">{deleteError}</p>}
              <div className="admin-modal-actions">
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setDeleteModalOpen(false)}
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
