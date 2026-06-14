// ProductCard — single item in the catalog grid.
// No image: layout is text-only (name, description, allergens, price).
// The entire card is clickable to open the product detail modal (onOpen).
// The "+" button adds one unit directly to the cart without opening the modal (onAdd).

import { formatAllergens } from '../data/allergens.js'

function formatPrice(price) {
  return price.toFixed(2).replace('.', ',') + ' €'
}

export default function ProductCard({ product, onAdd, onOpen }) {
  // Allow keyboard activation of the card itself (Enter / Space)
  function handleCardKeyDown(e) {
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
      onKeyDown={handleCardKeyDown}
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
          <button
            className="product-card-add"
            aria-label={`Añadir ${product.name} al pedido`}
            onClick={(e) => {
              e.stopPropagation()
              onAdd(product)
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>
    </article>
  )
}
