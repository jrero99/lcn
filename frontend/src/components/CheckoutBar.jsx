// CheckoutBar — fixed bottom bar showing delivery info and cart total.
// When the cart has items it can be expanded to show all cart lines with
// their customisations, and +/- / remove controls per line.
//
// Props
// -----
// mode                {string}   "domicilio" | "recoger"
// total               {number}   Cart total (already includes priceExtra)
// cartCount           {number}   Total number of units across all lines
// cartLines           {Array}    Array of { key, product, quantity, selectedOptions, removedIngredients, notes }
// addressLabel        {string|null} Formatted address label to display (delivery mode only)
// onChangeAddress     {function} Called when the user wants to change the delivery address
// onCheckout          {function} Called when the user confirms the order
// onChangeLineQuantity {function} (key, delta) — delta is +1 or -1
// onRemoveLine        {function} (key)

import { useState, useCallback } from 'react'

function formatTotal(amount) {
  return amount.toFixed(2).replace('.', ',') + ' €'
}

// Resolve option selections to readable label pairs.
// product.options = [{ id, label, choices: [{ id, label, priceExtra }] }]
function resolveOptionLabels(product, selectedOptions = {}) {
  if (!product.options || !selectedOptions) return []
  const result = []
  for (const group of product.options) {
    const choiceId = selectedOptions[group.id]
    if (choiceId) {
      const choice = group.choices.find((c) => c.id === choiceId)
      if (choice) result.push({ groupLabel: group.label, choiceLabel: choice.label })
    }
  }
  return result
}

// Compute unit price including priceExtra from selected choices
function computeUnitPrice(product, selectedOptions = {}) {
  let extra = 0
  if (product.options) {
    for (const group of product.options) {
      const choiceId = selectedOptions[group.id]
      if (choiceId) {
        const choice = group.choices.find((c) => c.id === choiceId)
        if (choice && choice.priceExtra) extra += choice.priceExtra
      }
    }
  }
  return product.price + extra
}

export default function CheckoutBar({
  mode,
  total,
  cartCount = 0,
  cartLines = [],
  addressLabel = null,
  onChangeAddress,
  onCheckout,
  onChangeLineQuantity,
  onRemoveLine,
}) {
  const isDelivery = mode === 'domicilio'
  const [expanded, setExpanded] = useState(false)

  const toggleExpanded = useCallback(() => {
    if (cartCount > 0) setExpanded((v) => !v)
  }, [cartCount])

  // Collapse when cart becomes empty
  if (cartCount === 0 && expanded) setExpanded(false)

  return (
    <div className="checkout-bar-container">
      {/* Expanded cart panel — rendered above the bar */}
      {expanded && cartLines.length > 0 && (
        <div
          className="checkout-cart-panel"
          role="region"
          aria-label="Línies del teu pedido"
        >
          <div className="checkout-cart-panel-inner">
            <ul className="checkout-cart-lines" aria-label="Productos en el pedido">
              {cartLines.map((line) => {
                const unitPrice = computeUnitPrice(line.product, line.selectedOptions)
                const lineTotal = unitPrice * line.quantity
                const optionLabels = resolveOptionLabels(line.product, line.selectedOptions)
                const hasCustom =
                  optionLabels.length > 0 ||
                  (line.removedIngredients && line.removedIngredients.length > 0) ||
                  !!line.notes

                return (
                  <li key={line.key} className="checkout-cart-line">
                    <div className="checkout-cart-line-main">
                      {/* Quantity controls */}
                      <div className="checkout-cart-line-qty" aria-label={`Cantidad de ${line.product.name}`}>
                        <button
                          className="checkout-cart-qty-btn"
                          aria-label={`Quitar una unidad de ${line.product.name}`}
                          onClick={() => onChangeLineQuantity(line.key, -1)}
                        >
                          <span aria-hidden="true">−</span>
                        </button>
                        <span className="checkout-cart-qty-num" aria-live="polite">
                          {line.quantity}
                        </span>
                        <button
                          className="checkout-cart-qty-btn"
                          aria-label={`Añadir una unidad de ${line.product.name}`}
                          onClick={() => onChangeLineQuantity(line.key, +1)}
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </div>

                      {/* Product name + line total */}
                      <span className="checkout-cart-line-name">{line.product.name}</span>
                      <span className="checkout-cart-line-total">
                        {formatTotal(lineTotal)}
                      </span>

                      {/* Remove button */}
                      <button
                        className="checkout-cart-remove-btn"
                        aria-label={`Eliminar ${line.product.name} del pedido`}
                        onClick={() => onRemoveLine(line.key)}
                      >
                        {/* Trash icon — inline SVG */}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                      </button>
                    </div>

                    {/* Customisation details — only shown when present */}
                    {hasCustom && (
                      <ul className="checkout-cart-custom" aria-label={`Personalizació de ${line.product.name}`}>
                        {optionLabels.map(({ groupLabel, choiceLabel }) => (
                          <li key={groupLabel} className="checkout-cart-custom-item">
                            <span className="checkout-cart-custom-label">{groupLabel}:</span>{' '}
                            {choiceLabel}
                          </li>
                        ))}
                        {line.removedIngredients && line.removedIngredients.length > 0 && (
                          <li className="checkout-cart-custom-item">
                            <span className="checkout-cart-custom-label">Sin:</span>{' '}
                            {line.removedIngredients.join(', ')}
                          </li>
                        )}
                        {line.notes && (
                          <li className="checkout-cart-custom-item">
                            <span className="checkout-cart-custom-label">Nota:</span>{' '}
                            &ldquo;{line.notes}&rdquo;
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Fixed bar */}
      <div className="checkout-bar" role="region" aria-label="Resumen del pedido">
        <div className="checkout-bar-left">
          {isDelivery ? (
            <>
              {/* House icon — inline SVG, no external dependency */}
              <svg
                className="checkout-bar-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                width="22"
                height="22"
              >
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <div className="checkout-bar-address">
                <span className="checkout-bar-address-label">Entregaremos tu pedido en:</span>
                <span className="checkout-bar-address-value">
                  {addressLabel ?? 'Sin dirección seleccionada'}
                </span>
              </div>
              <button
                className="btn checkout-bar-change-btn"
                onClick={onChangeAddress}
                aria-label="Cambiar dirección de entrega"
              >
                Cambiar
              </button>
            </>
          ) : (
            <>
              {/* Store icon for pickup mode */}
              <svg
                className="checkout-bar-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                width="22"
                height="22"
              >
                <path d="M20 4H4v2l8 5 8-5V4zm0 4.236l-8 5-8-5V20h16V8.236z" />
              </svg>
              <div className="checkout-bar-address">
                <span className="checkout-bar-address-label">Recogerás tu pedido en:</span>
                <span className="checkout-bar-address-value">
                  {/* TODO: Replace with real restaurant address */}
                  La Casa Nostra, Mataró
                </span>
              </div>
            </>
          )}
        </div>

        <div className="checkout-bar-right">
          {/* "Ver pedido (N)" toggle — only visible when there are items */}
          {cartCount > 0 && (
            <button
              className="checkout-bar-view-btn"
              onClick={toggleExpanded}
              aria-expanded={expanded}
              aria-controls="checkout-cart-panel"
              aria-label={expanded ? 'Ocultar detalle del pedido' : `Ver pedido (${cartCount} ${cartCount === 1 ? 'unitat' : 'unitats'})`}
            >
              {expanded ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  Ocultar
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  Ver pedido ({cartCount})
                </>
              )}
            </button>
          )}

          <span
            className="checkout-bar-total"
            aria-live="polite"
            aria-label={`Total: ${formatTotal(total)}`}
          >
            {formatTotal(total)}
          </span>
          <button
            className="btn checkout-bar-finish-btn"
            onClick={onCheckout}
            disabled={total === 0}
            aria-disabled={total === 0}
          >
            Finalizar pedido
          </button>
        </div>
      </div>
    </div>
  )
}
