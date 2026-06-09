// ProductCard — single item in the catalog grid.
// Shows name, description, price, optional allergens, and an "add to cart" button.

function formatPrice(price) {
  return price.toFixed(2).replace('.', ',') + ' €'
}

export default function ProductCard({ product, onAdd }) {
  return (
    <article className="product-card" aria-label={product.name}>
      <div className="product-card-body">
        <h3 className="product-card-name">{product.name}</h3>
        <p className="product-card-desc">{product.description}</p>

        {product.allergens && product.allergens.length > 0 && (
          <p className="product-card-allergens" aria-label="Alérgenos">
            <span className="allergen-label">Alérgenos: </span>
            {product.allergens.join(', ')}
          </p>
        )}

        <p className="product-card-price">{formatPrice(product.price)}</p>
      </div>

      {/* Product image placeholder — replace with <img> when real assets are available */}
      <div className="product-card-image-wrap">
        <div
          className="product-card-image placeholder"
          role="img"
          aria-label={`Imagen de ${product.name} (pendiente)`}
        />
        <button
          className="product-card-add"
          aria-label={`Añadir ${product.name} al pedido`}
          onClick={() => onAdd(product)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </article>
  )
}
