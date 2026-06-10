// OrderCatalog — step 2 of the ordering flow.
// Reached after choosing "Recoger en el local" (/hacer-pedido/recoger)
// or "Recibirlo en casa" (/hacer-pedido/domicilio).
// The `mode` prop carries that choice ("recoger" | "domicilio").
//
// Cart state is local (useState) for now.
// TODO: Lift cart state up or move to Context/Zustand when checkout page is built.
// TODO: Replace CATEGORIES mock data with a real API call: GET /api/catalog
//       (endpoint not yet defined; coordinate with backend-node).
//       The API response must include the `options` field per product (see catalogMockData.js).
//
// TODO (cart keying): currently the cart is keyed by product.id. Products with different
// option selections are treated as the same cart line (quantity increments). In the future,
// when the backend supports order lines with variants, each distinct combination of
// product + options should be a separate cart line (key = productId + serialised selections).

import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/catalogMockData.js'
import CategoryNav from '../components/CategoryNav.jsx'
import ProductCard from '../components/ProductCard.jsx'
import ProductModal from '../components/ProductModal.jsx'
import CheckoutBar from '../components/CheckoutBar.jsx'

export default function OrderCatalog({ mode = 'domicilio' }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id)
  // cart: { [productId]: { product, quantity } }
  const [cart, setCart] = useState({})
  // selectedProduct: the product whose detail modal is currently open, or null
  const [selectedProduct, setSelectedProduct] = useState(null)
  const sectionRefs = useRef({})

  // Add one unit of a product to the cart.
  // `_options` is captured from the modal but currently ignored for cart keying
  // (see TODO at the top of this file).
  const handleAddToCart = useCallback((product, _options) => {
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

  // Compute cart total
  const cartTotal = Object.values(cart).reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0
  )

  // Volver al paso de datos para editar la dirección/horario.
  function handleChangeAddress() {
    navigate(`/hacer-pedido/datos?mode=${mode}`)
  }

  // Finalizar: ir a la confirmación con los datos del carrito.
  function handleCheckout() {
    const items = Object.values(cart).map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
    }))
    navigate('/hacer-pedido/confirmar', {
      state: { mode, items, total: cartTotal },
    })
  }

  return (
    <div className="order-catalog">
      {/* Sticky category navigation bar */}
      <CategoryNav
        categories={CATEGORIES}
        activeId={activeCategory}
        onSelect={handleCategorySelect}
      />

      {/* Product sections — one per category */}
      <div className="order-catalog-content">
        {CATEGORIES.map((category) => (
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

      {/* Fixed checkout bar at the bottom */}
      <CheckoutBar
        mode={mode}
        total={cartTotal}
        onChangeAddress={handleChangeAddress}
        onCheckout={handleCheckout}
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
