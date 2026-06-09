// CheckoutBar — fixed bottom bar showing delivery info and cart total.
// TODO: "Canviar" button should open an address editor (not yet implemented).
// TODO: "FINALITZAR COMANDA" should navigate to the checkout/confirmation page (not yet created).

function formatTotal(amount) {
  return amount.toFixed(2).replace('.', ',') + ' €'
}

export default function CheckoutBar({ mode, total, onChangeAddress, onCheckout }) {
  const isDelivery = mode === 'domicilio'

  return (
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
                {/* TODO: Replace with real user address from profile/session */}
                Calle de Argentona, 3, Gracia, 08024 Barcelona, España
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
        <span className="checkout-bar-total" aria-live="polite" aria-label={`Total: ${formatTotal(total)}`}>
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
  )
}
