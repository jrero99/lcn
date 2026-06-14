// Carta — read-only catalog page, accessible at /carta.
//
// Strategy: reuses OrderCatalog's sub-components (CategoryNav, ProductCard,
// ProductModal) and the same async data loading via fetchCatalog(). This avoids
// duplicating any data-loading logic or catalog markup.
//
// OrderCatalog itself is NOT reused here (it's tightly coupled to the order flow:
// CheckoutBar, handleCheckout → /hacer-pedido/confirmar, etc.). Instead, Carta
// reimplements the catalog view with the same building blocks but without the
// order-flow machinery. This keeps the order flow completely untouched.
//
// Auth gating:
//   - Anonymous  → read-only view. "+ " button and checkout bar are hidden.
//                  A sticky CTA banner ("Inicia sesión para hacer tu pedido")
//                  is shown instead of the checkout bar.
//                  ProductModal opens but shows NO "Añadir al pedido" button.
//   - Logged in  → interactive: "+ " buttons and ProductModal "Añadir" are active.
//                  A CheckoutBar is shown at the bottom.
//                  On checkout, the user is sent to /hacer-pedido/datos?mode=domicilio
//                  (domicilio is the sensible default; the datos form lets them switch).
//                  TODO: ask the user whether /carta should force a mode choice
//                  (like HacerPedido does) before proceeding to /hacer-pedido/datos.
//
// NOTE: This client-side gating is UX only, NOT security.
// Any actual order creation is validated server-side. See AuthContext.jsx.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCatalog } from '../services/catalogService.js'
import { formatAllergens } from '../data/allergens.js'
import { useAuth } from '../context/AuthContext.jsx'
import CategoryNav from '../components/CategoryNav.jsx'
import ProductCard from '../components/ProductCard.jsx'
import ProductModal from '../components/ProductModal.jsx'
import CheckoutBar from '../components/CheckoutBar.jsx'

export default function Carta() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Catalog async state (mirrors OrderCatalog pattern)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)

  // Cart state — only meaningful when isAuthenticated
  const [cart, setCart] = useState({})

  // Product detail modal
  const [selectedProduct, setSelectedProduct] = useState(null)

  const sectionRefs = useRef({})

  // Load catalog on mount
  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchCatalog()
        if (!cancelled) {
          setCategories(data)
          if (data.length > 0) setActiveCategory(data[0].id)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message ?? 'Error al cargar la carta')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCatalog()
    return () => { cancelled = true }
  }, [])

  // Add one unit to the cart (only reachable when isAuthenticated)
  const handleAddToCart = useCallback((product, _customization) => {
    setCart((prev) => {
      const existing = prev[product.id]
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      }
    })
  }, [])

  const handleOpenProduct = useCallback((product) => {
    setSelectedProduct(product)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null)
  }, [])

  const handleCategorySelect = useCallback((categoryId) => {
    setActiveCategory(categoryId)
    const sectionEl = sectionRefs.current[categoryId]
    if (sectionEl) {
      const offset = 120 // sticky header (~60px) + sticky cat-nav (~48px)
      const top = sectionEl.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  const cartTotal = Object.values(cart).reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0
  )

  // Checkout: send the logged-in user into the order flow.
  // Default mode is "domicilio"; the datos form allows switching to "recoger".
  // TODO: Consider showing a mode-selection step (like HacerPedido) before
  // navigating — noted in AGENT_LOG.md as an open question.
  function handleCheckout() {
    const items = Object.values(cart).map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
    }))
    navigate('/hacer-pedido/confirmar', {
      state: { mode: 'domicilio', items, total: cartTotal },
    })
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

  // --- Empty catalog ---
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
      {/* Sticky category navigation bar — shared component, no changes */}
      <CategoryNav
        categories={categories}
        activeId={activeCategory}
        onSelect={handleCategorySelect}
      />

      {/* Product sections */}
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
                isAuthenticated
                  ? (
                    // Logged in: full interactive card
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAdd={handleAddToCart}
                      onOpen={handleOpenProduct}
                    />
                  )
                  : (
                    // Anonymous: read-only card (no "+" button)
                    <ReadOnlyProductCard
                      key={product.id}
                      product={product}
                      onOpen={handleOpenProduct}
                    />
                  )
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Bottom area: checkout bar (logged in) vs login CTA banner (anonymous) */}
      {isAuthenticated ? (
        <CheckoutBar
          mode="domicilio"
          total={cartTotal}
          onChangeAddress={() => navigate('/hacer-pedido/datos?mode=domicilio')}
          onCheckout={handleCheckout}
        />
      ) : (
        <div className="carta-login-banner" role="complementary" aria-label="Inicia sesión para pedir">
          <p className="carta-login-banner-text">
            ¿Quieres hacer tu pedido?
          </p>
          <Link className="btn btn-solid carta-login-banner-btn" to="/login">
            Inicia sesión para pedir
          </Link>
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={handleCloseModal}
          // If anonymous: pass a no-op for onAdd and hide the add button via readOnly prop
          onAdd={isAuthenticated ? handleAddToCart : () => {}}
          readOnly={!isAuthenticated}
        />
      )}
    </div>
  )
}

// ReadOnlyProductCard — like ProductCard but without the "+" button.
// Used on /carta when the user is not logged in.
// Clicking opens the ProductModal (also in read-only mode).
function ReadOnlyProductCard({ product, onOpen }) {
  function formatPrice(price) {
    return price.toFixed(2).replace('.', ',') + ' €'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(product)
    }
  }

  return (
    <article
      className="product-card"
      role="button"
      tabIndex={0}
      aria-label={`Ver detalle de ${product.name}`}
      onClick={() => onOpen(product)}
      onKeyDown={handleKeyDown}
    >
      <div className="product-card-body">
        <h3 className="product-card-name">{product.name}</h3>
        <p className="product-card-desc">{product.description}</p>

        {product.allergens && product.allergens.length > 0 && (
          <p className="product-card-allergens" aria-label="Alérgenos">
            <span className="allergen-label">Alérgenos: </span>
            {formatAllergens(product.allergens)}
          </p>
        )}

        <div className="product-card-footer">
          <p className="product-card-price">{formatPrice(product.price)}</p>
          {/* No "+" button in read-only mode */}
        </div>
      </div>
    </article>
  )
}
