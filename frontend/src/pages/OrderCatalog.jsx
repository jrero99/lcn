// OrderCatalog — step 2 of the ordering flow.
// Reached after choosing "Recoger en el local" (/hacer-pedido/recoger)
// or "Recibirlo en casa" (/hacer-pedido/domicilio).
// The `mode` prop carries that choice ("recoger" | "domicilio").
//
// Cart state is local (useState) for now.
// TODO: Lift cart state up or move to Context/Zustand when checkout page is built.
//
// Catalog data is loaded asynchronously via catalogService.fetchCatalog().
// The service currently returns mock data. When GET /api/catalog is implemented
// on the backend, only catalogService.js needs to change — this component stays
// as-is.
//
// Cart is keyed by a stable string that combines productId + serialised
// customisation (options sorted by groupId, ingredients sorted, notes trimmed).
// Two units of the same product with different options = two separate lines.
// The "+" on ProductCard adds with empty customisation — its own line key.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { fetchCatalog } from '../services/catalogService.js'
import CategoryNav from '../components/CategoryNav.jsx'
import ProductCard from '../components/ProductCard.jsx'
import ProductModal from '../components/ProductModal.jsx'
import CheckoutBar from '../components/CheckoutBar.jsx'

// ---------------------------------------------------------------------------
// Cart helpers
// ---------------------------------------------------------------------------

/**
 * Build a stable cart-line key from product id + customisation.
 * Two calls with semantically identical customisations produce the same key.
 */
function buildCartKey(productId, { selectedOptions = {}, removedIngredients = [], notes = '' } = {}) {
  const sortedOptions = Object.fromEntries(
    Object.entries(selectedOptions).sort(([a], [b]) => a.localeCompare(b))
  )
  const sortedRemoved = [...removedIngredients].sort()
  return `${productId}|${JSON.stringify({ o: sortedOptions, r: sortedRemoved, n: notes.trim() })}`
}

/**
 * Compute the unit price of a product including any priceExtra from selected option choices.
 */
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

/**
 * Resolve selectedOptions to human-readable labels.
 * Returns an array of { groupLabel, choiceLabel }.
 */
function resolveOptionLabels(product, selectedOptions = {}) {
  if (!product.options || !selectedOptions) return []
  const result = []
  for (const group of product.options) {
    const choiceId = selectedOptions[group.id]
    if (choiceId) {
      const choice = group.choices.find((c) => c.id === choiceId)
      if (choice) {
        result.push({ groupLabel: group.label, choiceLabel: choice.label })
      }
    }
  }
  return result
}

export default function OrderCatalog({ mode = 'domicilio' }) {
  const navigate = useNavigate()
  const { state: navState } = useLocation()

  // addressId: UUID of the selected delivery address, passed from PedidoDatos.
  // Only meaningful when mode === 'domicilio'. null for pickup orders.
  const addressId = navState?.addressId ?? null
  // addressLabel: formatted string for display in the checkout bar.
  const addressLabel = navState?.addressLabel ?? null

  // Catalog async state
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Active category tab — null until the catalog loads
  const [activeCategory, setActiveCategory] = useState(null)

  // cart: { [lineKey]: { key, product, quantity, selectedOptions, removedIngredients, notes } }
  const [cart, setCart] = useState({})

  // selectedProduct: the product whose detail modal is currently open, or null
  const [selectedProduct, setSelectedProduct] = useState(null)

  const sectionRefs = useRef({})

  // Load catalog on mount. Guard against setState after unmount.
  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchCatalog()
        if (!cancelled) {
          setCategories(data)
          // Set the first category as active once data arrives
          if (data.length > 0) {
            setActiveCategory(data[0].id)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message ?? 'Error al cargar la carta')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadCatalog()

    return () => {
      cancelled = true
    }
  }, [])

  // Add one unit of a product + customisation to the cart.
  // If the same (product + customisation) key exists, increment quantity.
  // Otherwise, create a new cart line.
  const handleAddToCart = useCallback((product, customization = {}) => {
    const { selectedOptions = {}, removedIngredients = [], notes = '' } = customization
    const key = buildCartKey(product.id, { selectedOptions, removedIngredients, notes })

    setCart((prev) => {
      const existing = prev[key]
      return {
        ...prev,
        [key]: {
          key,
          product,
          quantity: existing ? existing.quantity + 1 : 1,
          selectedOptions,
          removedIngredients,
          notes: notes.trim(),
        },
      }
    })
  }, [])

  // Change the quantity of a cart line. Removes the line when quantity reaches 0.
  const handleChangeLineQuantity = useCallback((key, delta) => {
    setCart((prev) => {
      const line = prev[key]
      if (!line) return prev
      const nextQty = line.quantity + delta
      if (nextQty <= 0) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { ...line, quantity: nextQty } }
    })
  }, [])

  // Remove a cart line entirely.
  const handleRemoveLine = useCallback((key) => {
    setCart((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // Open the product detail modal
  const handleOpenProduct = useCallback((product) => {
    setSelectedProduct(product)
  }, [])

  // Close the product detail modal
  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null)
  }, [])

  // Change active category and scroll to its section
  const handleCategorySelect = useCallback((categoryId) => {
    setActiveCategory(categoryId)
    const sectionEl = sectionRefs.current[categoryId]
    if (sectionEl) {
      // Offset to account for the sticky header (~60px) + sticky cat-nav (~48px)
      const offset = 120
      const top = sectionEl.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  // Cart lines as an array (stable order: insertion order via Object.values)
  const cartLines = Object.values(cart)

  // Compute cart total, including priceExtra from selected choices
  const cartTotal = cartLines.reduce((sum, line) => {
    const unitPrice = computeUnitPrice(line.product, line.selectedOptions)
    return sum + unitPrice * line.quantity
  }, 0)

  // Total number of individual units across all lines (for the badge)
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)

  // Volver al paso de datos para editar la dirección/horario.
  function handleChangeAddress() {
    navigate(`/hacer-pedido/datos?mode=${mode}`)
  }

  // Finalizar: build rich items and navigate to confirmation.
  function handleCheckout() {
    const items = cartLines.map((line) => {
      const unitPrice = computeUnitPrice(line.product, line.selectedOptions)
      return {
        // key is used for React rendering on the confirmation page
        key: line.key,
        id: line.product.id,
        name: line.product.name,
        unitPrice,
        quantity: line.quantity,
        lineTotal: unitPrice * line.quantity,
        // Human-readable option selections (resolved here so confirmation page
        // doesn't need product.options)
        options: resolveOptionLabels(line.product, line.selectedOptions),
        removedIngredients: line.removedIngredients,
        notes: line.notes,
      }
    })
    navigate('/hacer-pedido/confirmar', {
      state: {
        mode,
        items,
        total: cartTotal,
        // addressId is the UUID of the delivery address selected in PedidoDatos.
        // Required for mode=domicilio; null for pickup.
        // OrderConfirmation passes this to POST /api/orders.
        addressId,
        addressLabel,
      },
    })
  }

  // --- Page-reload guard for domicilio mode ---
  // navState is lost on hard reload. Without an addressId there is no delivery
  // address, so we send the user back to the data-entry step rather than showing
  // a broken / empty address in the checkout bar.
  if (mode === 'domicilio' && !addressId) {
    return <Navigate to="/hacer-pedido/datos?mode=domicilio" replace />
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="catalog-status-wrap" aria-live="polite">
        <p className="catalog-status-msg">Cargando la carta…</p>
      </div>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="catalog-status-wrap" aria-live="assertive">
        <p className="catalog-status-msg catalog-status-msg--error">
          No se ha podido cargar la carta.
        </p>
        <p className="catalog-status-hint">{error}</p>
        <button
          className="btn btn-solid catalog-retry-btn"
          onClick={() => {
            // Re-trigger the effect by resetting error + loading
            setError(null)
            setLoading(true)
            fetchCatalog()
              .then((data) => {
                setCategories(data)
                if (data.length > 0) setActiveCategory(data[0].id)
              })
              .catch((err) => setError(err.message ?? 'Error al cargar la carta'))
              .finally(() => setLoading(false))
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  // --- Empty catalog (shouldn't happen in practice, but guard anyway) ---
  if (categories.length === 0) {
    return (
      <div className="catalog-status-wrap" aria-live="polite">
        <p className="catalog-status-msg">La carta no está disponible en este momento.</p>
      </div>
    )
  }

  // --- Main render ---
  return (
    <div className="order-catalog">
      {/* Sticky category navigation bar */}
      <CategoryNav
        categories={categories}
        activeId={activeCategory}
        onSelect={handleCategorySelect}
      />

      {/* Product sections — one per category */}
      <div className="order-catalog-content">
        {categories.map((category) => (
          <section
            key={category.id}
            id={`cat-${category.id}`}
            className="catalog-section"
            ref={(el) => { sectionRefs.current[category.id] = el }}
            aria-label={category.label}
          >
            <h2 className="catalog-section-title">{category.heading}</h2>

            <div className="product-grid">
              {category.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={handleAddToCart}
                  onOpen={handleOpenProduct}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Fixed checkout bar at the bottom — expandable to show cart lines */}
      <CheckoutBar
        mode={mode}
        total={cartTotal}
        cartCount={cartCount}
        cartLines={cartLines}
        addressLabel={addressLabel}
        onChangeAddress={handleChangeAddress}
        onCheckout={handleCheckout}
        onChangeLineQuantity={handleChangeLineQuantity}
        onRemoveLine={handleRemoveLine}
      />

      {/* Product detail modal — rendered when a card is clicked */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={handleCloseModal}
          onAdd={handleAddToCart}
        />
      )}
    </div>
  )
}
