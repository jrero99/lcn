// ProductModal — product detail sheet / modal.
// Opens when the user clicks a ProductCard.
// Renders product name, description, allergens, optional option groups and the
// "Añadir al pedido" action.
//
// Accessibility:
//   - role="dialog" aria-modal="true" aria-labelledby pointing to the title.
//   - Focus is trapped inside while open; returns to the opener on close.
//   - Closes on: X button, backdrop click, Escape key.
//   - Body scroll is locked while open.
//   - Respects prefers-reduced-motion (no entry animation in that case).

import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

function formatPrice(price) {
  return price.toFixed(2).replace('.', ',') + ' €'
}

// Build the initial selections map: { [groupId]: choices[0].id } for each group.
// Selecting the first choice by default gives the user a ready-to-submit state
// without forcing a mandatory interaction, which is better UX on mobile.
function buildInitialSelections(options) {
  if (!options || options.length === 0) return {}
  return Object.fromEntries(options.map((group) => [group.id, group.choices[0].id]))
}

// `readOnly` prop: when true (used on /carta for anonymous users), the
// "Añadir al pedido" button is hidden and option inputs are disabled.
// The modal still opens for informational purposes (name, description, allergens).
export default function ProductModal({ product, onClose, onAdd, readOnly = false }) {
  const titleId = `modal-title-${product.id}`
  const dialogRef = useRef(null)
  const closeBtnRef = useRef(null)
  // openerRef: element that had focus before the modal opened — restored on close
  const openerRef = useRef(document.activeElement)

  const [selections, setSelections] = useState(() =>
    buildInitialSelections(product.options)
  )
  // removedIngredients: list of ingredient names the customer unchecked (wants out)
  const [removedIngredients, setRemovedIngredients] = useState([])
  // notes: free-text specification the customer wants to add to this line
  const [notes, setNotes] = useState('')

  // Reset all customisation when the product changes (user opens a different card)
  useEffect(() => {
    setSelections(buildInitialSelections(product.options))
    setRemovedIngredients([])
    setNotes('')
  }, [product])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Move focus into the modal on mount (close button is the natural first focus)
  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [])

  // Return focus to the opener on unmount
  useEffect(() => {
    const opener = openerRef.current
    return () => {
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  // Close on Escape; trap focus inside the dialog
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusable = Array.from(
          dialog.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.disabled)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose]
  )

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleAdd() {
    onAdd(product, {
      selectedOptions: selections,
      removedIngredients,
      notes: notes.trim(),
    })
    onClose()
  }

  function handleOptionChange(groupId, choiceId) {
    setSelections((prev) => ({ ...prev, [groupId]: choiceId }))
  }

  // Toggle an ingredient in/out of the removed list.
  function handleIngredientToggle(ingredient) {
    setRemovedIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((i) => i !== ingredient)
        : [...prev, ingredient]
    )
  }

  const hasOptions = product.options && product.options.length > 0
  const hasIngredients = product.ingredients && product.ingredients.length > 0

  return (
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */
    <div
      className="product-modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Close button */}
        <button
          ref={closeBtnRef}
          className="modal-close-btn"
          aria-label="Cerrar ficha del producto"
          onClick={onClose}
        >
          <span aria-hidden="true">✕</span>
        </button>

        {/* Scrollable content area */}
        <div className="modal-body">
          <h2 id={titleId} className="modal-product-name">
            {product.name}
          </h2>

          <p className="modal-product-desc">{product.description}</p>

          {product.allergens && product.allergens.length > 0 && (
            <p className="modal-product-allergens" aria-label="Alérgenos">
              <span className="allergen-label">Alérgenos: </span>
              {product.allergens.join(', ')}
            </p>
          )}

          {/* Option groups — only rendered when the product has options */}
          {hasOptions &&
            product.options.map((group) => (
              <fieldset key={group.id} className="modal-option-group">
                <legend className="modal-option-legend">{group.label}</legend>
                <div className="modal-option-choices">
                  {group.choices.map((choice) => {
                    const inputId = `opt-${product.id}-${group.id}-${choice.id}`
                    const isChecked = selections[group.id] === choice.id
                    return (
                      <label
                        key={choice.id}
                        htmlFor={inputId}
                        className={`radio-option${isChecked ? ' radio-option--checked' : ''}`}
                      >
                        <input
                          type="radio"
                          id={inputId}
                          name={`${product.id}-${group.id}`}
                          value={choice.id}
                          checked={isChecked}
                          onChange={() => handleOptionChange(group.id, choice.id)}
                        />
                        <span className="radio-circle" aria-hidden="true" />
                        <span className="radio-label-text">{choice.label}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ))}

          {/* Remove ingredients — checkboxes, all checked by default */}
          {hasIngredients && (
            <fieldset className="modal-option-group">
              <legend className="modal-option-legend">Quita lo que no quieras</legend>
              <div className="modal-ingredient-list">
                {product.ingredients.map((ingredient) => {
                  const inputId = `ing-${product.id}-${ingredient}`
                  const isKept = !removedIngredients.includes(ingredient)
                  return (
                    <label
                      key={ingredient}
                      htmlFor={inputId}
                      className={`ingredient-option${isKept ? '' : ' ingredient-option--removed'}`}
                    >
                      <input
                        type="checkbox"
                        id={inputId}
                        checked={isKept}
                        onChange={() => handleIngredientToggle(ingredient)}
                      />
                      <span className="ingredient-check" aria-hidden="true" />
                      <span className="ingredient-label-text">{ingredient}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}

          {/* Free-text specification */}
          <div className="modal-notes">
            <label className="modal-option-legend" htmlFor={`notes-${product.id}`}>
              ¿Alguna especificación?
            </label>
            <textarea
              id={`notes-${product.id}`}
              className="modal-notes-input"
              rows="3"
              maxLength="280"
              placeholder="Ej.: poco hecha, sin cebolla, salsa aparte…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Sticky footer: price + (optional) add button */}
        <div className="modal-footer">
          <span className="modal-price">{formatPrice(product.price)}</span>
          {readOnly ? (
            // Anonymous user on /carta: show login CTA instead of add button
            <Link
              className="btn btn-solid modal-add-btn"
              to="/login"
              onClick={onClose}
            >
              Inicia sesión para pedir
            </Link>
          ) : (
            <button className="btn btn-solid modal-add-btn" onClick={handleAdd}>
              Añadir al pedido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
