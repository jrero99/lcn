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

export default function ProductModal({ product, onClose, onAdd }) {
  const titleId = `modal-title-${product.id}`
  const dialogRef = useRef(null)
  const closeBtnRef = useRef(null)
  // openerRef: element that had focus before the modal opened — restored on close
  const openerRef = useRef(document.activeElement)

  const [selections, setSelections] = useState(() =>
    buildInitialSelections(product.options)
  )

  // Reset selections when the product changes (user opens a different card)
  useEffect(() => {
    setSelections(buildInitialSelections(product.options))
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
    onAdd(product, selections)
    onClose()
  }

  function handleOptionChange(groupId, choiceId) {
    setSelections((prev) => ({ ...prev, [groupId]: choiceId }))
  }

  const hasOptions = product.options && product.options.length > 0

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
        </div>

        {/* Sticky footer: price + add button */}
        <div className="modal-footer">
          <span className="modal-price">{formatPrice(product.price)}</span>
          <button className="btn btn-solid modal-add-btn" onClick={handleAdd}>
            Añadir al pedido
          </button>
        </div>
      </div>
    </div>
  )
}
