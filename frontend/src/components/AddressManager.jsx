// AddressManager — reusable component for listing, creating, editing and
// deleting a user's saved addresses.
//
// Usage A (pedido a domicilio — PedidoDatos.jsx):
//   <AddressManager
//     selectedId={selectedAddressId}
//     onSelect={(id) => setSelectedAddressId(id)}
//     onFormOpenChange={(isOpen) => setAddressFormOpen(isOpen)}
//   />
//
// Usage B (future account/profile page):
//   <AddressManager />  — standalone management mode, no selection callback
//
// Internal states:
//   'list'     — shows saved addresses with select/edit/delete controls
//   'add'      — empty form to create a new address (POST /api/addresses)
//   'edit'     — form pre-filled with an existing address (PATCH /api/addresses/:id)
//
// Validation mirrors the server constraints (UX only — server re-validates):
//   street: 3–200, number: 1–10, floorDoor: ≤50, postalCode: 5 digits,
//   city: 2–100 (must contain Mataró/Mataro OR CP 08301-08304), notes: ≤300, label: ≤50

import { useState, useEffect, useCallback } from 'react'
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  formatAddress,
} from '../services/addressService.js'
import Modal from './Modal.jsx'

// ---------------------------------------------------------------------------
// Address form — shared between add and edit
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  label: '',
  street: '',
  number: '',
  floorDoor: '',
  postalCode: '',
  city: 'Mataró',
  notes: '',
}

// Delivery zone codes accepted by the server: Mataró (08301–08304).
const MATARO_POSTAL_CODES = ['08301', '08302', '08303', '08304']

function isInDeliveryZone(city, postalCode) {
  const cityNorm = city.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const validCity = cityNorm === 'mataro'
  const validPostal = MATARO_POSTAL_CODES.includes(postalCode.trim())
  return validCity || validPostal
}

function validateForm(values) {
  const errs = {}
  if (!values.street.trim() || values.street.trim().length < 3)
    errs.street = 'Introduce la calle (mínimo 3 caracteres).'
  if (!values.number.trim())
    errs.number = 'Introduce el número.'
  if (values.floorDoor.length > 50)
    errs.floorDoor = 'Máximo 50 caracteres.'
  if (!/^\d{5}$/.test(values.postalCode))
    errs.postalCode = 'El código postal debe tener 5 dígitos.'
  if (!values.city.trim() || values.city.trim().length < 2)
    errs.city = 'Introduce la ciudad.'
  if (values.notes.length > 300)
    errs.notes = 'Máximo 300 caracteres.'
  if (values.label.length > 50)
    errs.label = 'Máximo 50 caracteres.'
  // Delivery zone check: city must be Mataró OR postal code must be 08301–08304.
  // This mirrors the server rule (UX only — server re-validates with 422).
  if (
    /^\d{5}$/.test(values.postalCode) &&
    values.city.trim().length >= 2 &&
    !isInDeliveryZone(values.city, values.postalCode)
  ) {
    errs.city = 'Solo realizamos entregas en Mataró (CP 08301–08304).'
    errs.postalCode = 'Solo realizamos entregas en Mataró (CP 08301–08304).'
  }
  return errs
}

function AddressForm({ initial = EMPTY_FORM, onSave, onCancel, saving, serverError }) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validateForm(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    // Build payload — omit empty optional fields
    const payload = {
      street: values.street.trim(),
      number: values.number.trim(),
      postalCode: values.postalCode.trim(),
      city: values.city.trim(),
    }
    if (values.label.trim()) payload.label = values.label.trim()
    if (values.floorDoor.trim()) payload.floorDoor = values.floorDoor.trim()
    if (values.notes.trim()) payload.notes = values.notes.trim()
    onSave(payload)
  }

  return (
    <form className="addr-form" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <p className="addr-form-server-error" role="alert">{serverError}</p>
      )}

      {/* Label (optional) */}
      <div className="addr-form-field">
        <label htmlFor="addr-label" className="addr-form-label">
          Nombre de la dirección <span className="addr-form-optional">(opcional)</span>
        </label>
        <input
          id="addr-label"
          className="addr-form-input"
          type="text"
          placeholder="Casa, Trabajo…"
          value={values.label}
          maxLength={50}
          onChange={(e) => set('label', e.target.value)}
          autoComplete="off"
        />
        {errors.label && <p className="field-error" role="alert">{errors.label}</p>}
      </div>

      {/* Street + number on one row */}
      <div className="addr-form-row">
        <div className="addr-form-field addr-form-field--street">
          <label htmlFor="addr-street" className="addr-form-label">Calle *</label>
          <input
            id="addr-street"
            className={`addr-form-input${errors.street ? ' addr-form-input--error' : ''}`}
            type="text"
            placeholder="Carrer de Barcelona"
            value={values.street}
            maxLength={200}
            onChange={(e) => set('street', e.target.value)}
            autoComplete="street-address"
            required
          />
          {errors.street && <p className="field-error" role="alert">{errors.street}</p>}
        </div>
        <div className="addr-form-field addr-form-field--number">
          <label htmlFor="addr-number" className="addr-form-label">Número *</label>
          <input
            id="addr-number"
            className={`addr-form-input${errors.number ? ' addr-form-input--error' : ''}`}
            type="text"
            placeholder="12"
            value={values.number}
            maxLength={10}
            onChange={(e) => set('number', e.target.value)}
            autoComplete="off"
            required
          />
          {errors.number && <p className="field-error" role="alert">{errors.number}</p>}
        </div>
      </div>

      {/* Floor / door (optional) */}
      <div className="addr-form-field">
        <label htmlFor="addr-floor" className="addr-form-label">
          Piso / puerta <span className="addr-form-optional">(opcional)</span>
        </label>
        <input
          id="addr-floor"
          className="addr-form-input"
          type="text"
          placeholder="3r 2a, Bajos…"
          value={values.floorDoor}
          maxLength={50}
          onChange={(e) => set('floorDoor', e.target.value)}
          autoComplete="off"
        />
        {errors.floorDoor && <p className="field-error" role="alert">{errors.floorDoor}</p>}
      </div>

      {/* Postal code + city */}
      <div className="addr-form-row">
        <div className="addr-form-field addr-form-field--cp">
          <label htmlFor="addr-postal" className="addr-form-label">Código postal *</label>
          <input
            id="addr-postal"
            className={`addr-form-input${errors.postalCode ? ' addr-form-input--error' : ''}`}
            type="text"
            placeholder="08302"
            value={values.postalCode}
            maxLength={5}
            onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
            autoComplete="postal-code"
            inputMode="numeric"
            required
          />
          {errors.postalCode && <p className="field-error" role="alert">{errors.postalCode}</p>}
        </div>
        <div className="addr-form-field addr-form-field--city">
          <label htmlFor="addr-city" className="addr-form-label">Ciudad *</label>
          <input
            id="addr-city"
            className={`addr-form-input${errors.city ? ' addr-form-input--error' : ''}`}
            type="text"
            placeholder="Mataró"
            value={values.city}
            maxLength={100}
            onChange={(e) => set('city', e.target.value)}
            autoComplete="address-level2"
            required
          />
          {errors.city && <p className="field-error" role="alert">{errors.city}</p>}
        </div>
      </div>

      {/* Notes (optional) */}
      <div className="addr-form-field">
        <label htmlFor="addr-notes" className="addr-form-label">
          Notas de entrega <span className="addr-form-optional">(opcional)</span>
        </label>
        <textarea
          id="addr-notes"
          className="addr-form-input addr-form-textarea"
          placeholder="Portero 2B, timbre roto, dejar en conserjería…"
          value={values.notes}
          maxLength={300}
          rows={2}
          onChange={(e) => set('notes', e.target.value)}
        />
        {errors.notes && <p className="field-error" role="alert">{errors.notes}</p>}
      </div>

      <div className="addr-form-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn-solid"
          disabled={saving}
        >
          {saving ? 'Guardando…' : 'Guardar dirección'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// AddressManager — main component
// ---------------------------------------------------------------------------

/**
 * Props
 * -----
 * selectedId        {string|null}    Currently selected address UUID (for pedido flow)
 * onSelect          {function|null}  Called with (id: string) when user selects an address;
 *                                    if null, component acts as standalone manager
 * onSelectAddress   {function|null}  Optional additional callback called with the full Address
 *                                    object when selection changes (useful when the parent needs
 *                                    the formatted label).
 * onFormOpenChange  {function|null}  Called with (isOpen: boolean) whenever an add/edit form
 *                                    opens or closes. Used by PedidoDatos to block "Continuar"
 *                                    while an unsaved form is open (BUG-1).
 * showHeading       {boolean}        Whether to render the "Mis direcciones" heading
 *                                    Default: true in standalone mode, false when used inside PedidoDatos
 */
export default function AddressManager({
  selectedId = null,
  onSelect = null,
  onSelectAddress = null,
  onFormOpenChange = null,
  showHeading = true,
}) {
  const [addresses, setAddresses] = useState([])
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ok' | 'error'
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState('list') // 'list' | 'add' | 'edit'
  const [editingAddress, setEditingAddress] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formServerError, setFormServerError] = useState('')

  // Helper: change view and notify parent when a form opens or closes (BUG-1).
  function changeView(next) {
    setView(next)
    if (onFormOpenChange) onFormOpenChange(next !== 'list')
  }

  // Confirm-delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, label: '' })
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Load addresses on mount
  useEffect(() => {
    let cancelled = false
    setLoadState('loading')

    getAddresses()
      .then(({ addresses: list }) => {
        if (cancelled) return
        setAddresses(list)
        setLoadState('ok')
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.message)
        setLoadState('error')
      })

    return () => { cancelled = true }
  }, [])

  // ----- handlers -----

  const handleSaveNew = useCallback(async (payload) => {
    setSaving(true)
    setFormServerError('')
    try {
      const { address } = await createAddress(payload)
      setAddresses((prev) => [...prev, address])
      // Auto-select the new address if we're in selection mode
      if (onSelect) onSelect(address.id)
      if (onSelectAddress) onSelectAddress(address)
      changeView('list')
    } catch (err) {
      setFormServerError(err.message)
    } finally {
      setSaving(false)
    }
  }, [onSelect, onSelectAddress, onFormOpenChange]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveEdit = useCallback(async (payload) => {
    if (!editingAddress) return
    setSaving(true)
    setFormServerError('')
    try {
      const { address } = await updateAddress(editingAddress.id, payload)
      setAddresses((prev) => prev.map((a) => (a.id === address.id ? address : a)))
      changeView('list')
      setEditingAddress(null)
    } catch (err) {
      setFormServerError(err.message)
    } finally {
      setSaving(false)
    }
  }, [editingAddress, onFormOpenChange]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartEdit(address) {
    setEditingAddress(address)
    setFormServerError('')
    changeView('edit')
  }

  function handleCancelForm() {
    changeView('list')
    setEditingAddress(null)
    setFormServerError('')
  }

  function handleStartAdd() {
    setFormServerError('')
    changeView('add')
  }

  function handleRequestDelete(address) {
    setDeleteError('')
    setDeleteModal({
      open: true,
      id: address.id,
      label: address.label || formatAddress(address),
    })
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAddress(deleteModal.id)
      // If the deleted address was selected, deselect it
      if (onSelect && selectedId === deleteModal.id) onSelect(null)
      setAddresses((prev) => prev.filter((a) => a.id !== deleteModal.id))
      setDeleteModal({ open: false, id: null, label: '' })
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  // ----- render -----

  if (loadState === 'loading') {
    return (
      <div className="addr-manager-status" aria-live="polite">
        <span className="addr-manager-loading-text">Cargando direcciones…</span>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="addr-manager-status" role="alert">
        <p className="addr-manager-error">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="addr-manager">
      {/* Confirm delete modal (reuses generic Modal) */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => !deleting && setDeleteModal({ open: false, id: null, label: '' })}
        title="Eliminar dirección"
        message={`¿Seguro que quieres eliminar "${deleteModal.label}"? Esta acción no se puede deshacer.`}
      >
        {deleteError && (
          <p className="addr-delete-error" role="alert">{deleteError}</p>
        )}
        <div className="addr-modal-actions">
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => setDeleteModal({ open: false, id: null, label: '' })}
            disabled={deleting}
          >
            Cancelar
          </button>
          <button
            className="btn btn-solid btn--danger"
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </Modal>

      {showHeading && view === 'list' && (
        <h2 className="addr-manager-heading">Mis direcciones</h2>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          {addresses.length === 0 ? (
            <p className="addr-manager-empty">
              No tienes ninguna dirección guardada.
            </p>
          ) : (
            <ul className="addr-list" role="radiogroup" aria-label="Selecciona una dirección de entrega">
              {addresses.map((addr) => {
                const isSelected = selectedId === addr.id
                const addrText = formatAddress(addr)
                return (
                  <li key={addr.id} className={`addr-item${isSelected ? ' addr-item--selected' : ''}`}>
                    {/* Selection radio — only rendered when onSelect is provided */}
                    {onSelect && (
                      <label className="addr-item-radio-label">
                        <input
                          type="radio"
                          name="address-select"
                          value={addr.id}
                          checked={isSelected}
                          onChange={() => {
                            onSelect(addr.id)
                            if (onSelectAddress) onSelectAddress(addr)
                          }}
                          className="addr-item-radio"
                          aria-label={`Seleccionar: ${addr.label ? addr.label + ' — ' : ''}${addrText}`}
                        />
                        <span className="addr-item-radio-dot" aria-hidden />
                      </label>
                    )}

                    <div
                      className="addr-item-content"
                      onClick={onSelect ? () => {
                        onSelect(addr.id)
                        if (onSelectAddress) onSelectAddress(addr)
                      } : undefined}
                      style={onSelect ? { cursor: 'pointer' } : undefined}
                    >
                      {addr.label && (
                        <span className="addr-item-label">{addr.label}</span>
                      )}
                      <span className="addr-item-text">{addrText}</span>
                      {addr.notes && (
                        <span className="addr-item-notes">{addr.notes}</span>
                      )}
                    </div>

                    <div className="addr-item-actions">
                      <button
                        type="button"
                        className="addr-item-btn addr-item-btn--edit"
                        aria-label={`Editar ${addr.label || addrText}`}
                        onClick={() => handleStartEdit(addr)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="addr-item-btn addr-item-btn--delete"
                        aria-label={`Eliminar ${addr.label || addrText}`}
                        onClick={() => handleRequestDelete(addr)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Add new address button — disabled if at limit (10) */}
          {addresses.length < 10 && (
            <button
              type="button"
              className="addr-add-btn"
              onClick={handleStartAdd}
            >
              <span className="addr-add-btn-icon" aria-hidden>+</span>
              Añadir nueva dirección
            </button>
          )}
          {addresses.length >= 10 && (
            <p className="addr-manager-limit-msg">
              Has alcanzado el límite de 10 direcciones. Elimina una para poder añadir otra.
            </p>
          )}
        </>
      )}

      {/* ADD FORM */}
      {view === 'add' && (
        <AddressForm
          initial={EMPTY_FORM}
          onSave={handleSaveNew}
          onCancel={handleCancelForm}
          saving={saving}
          serverError={formServerError}
        />
      )}

      {/* EDIT FORM */}
      {view === 'edit' && editingAddress && (
        <AddressForm
          initial={{
            label: editingAddress.label || '',
            street: editingAddress.street,
            number: editingAddress.number,
            floorDoor: editingAddress.floorDoor || '',
            postalCode: editingAddress.postalCode,
            city: editingAddress.city,
            notes: editingAddress.notes || '',
          }}
          onSave={handleSaveEdit}
          onCancel={handleCancelForm}
          saving={saving}
          serverError={formServerError}
        />
      )}
    </div>
  )
}
