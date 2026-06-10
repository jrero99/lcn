import { useEffect, useRef } from 'react'

/**
 * Modal — generic accessible dialog overlay.
 *
 * Props
 * -----
 * isOpen   {boolean}  Whether the modal is visible.
 * onClose  {function} Called when the user closes the modal (X button, Escape, backdrop click).
 * title    {string}   Heading text. Default: "¡GRACIAS POR TU PEDIDO!"
 * message  {string}   Body paragraph. Default: the standard order-received copy.
 * children {node}     Optional: custom content rendered below the message paragraph.
 *                     When provided, `message` is still rendered above children unless
 *                     you pass message={null}.
 *
 * API-ready usage (mañana, cuando el back devuelva el mensaje):
 *   const { data } = useOrderConfirmation(orderId)
 *   <Modal
 *     isOpen={showModal}
 *     onClose={handleClose}
 *     title={data?.title}         // falls back to default when undefined
 *     message={data?.message}     // falls back to default when undefined
 *   />
 */
export default function Modal({
  isOpen,
  onClose,
  title = '¡GRACIAS POR TU PEDIDO!',
  message = 'Hemos recibido tu pedido correctamente y ya lo estamos preparando. Te avisaremos cuando esté listo o en camino.',
  children,
}) {
  const closeButtonRef = useRef(null)
  const dialogRef = useRef(null)

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  // Move focus to close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()

      // Basic focus trap: keep Tab/Shift+Tab inside the dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) { e.preventDefault(); return }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    /* Backdrop */
    <div
      className="modal-backdrop"
      onClick={onClose}
      aria-hidden="true"
    >
      {/* Dialog panel — stop propagation so clicks inside don't close */}
      <div
        ref={dialogRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          className="modal-close"
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
        >
          {/* X icon — inline SVG, no external dependency */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Title */}
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>

        {/* Body message */}
        {message && (
          <p className="modal-message">{message}</p>
        )}

        {/* Optional custom content (e.g. order summary, CTA buttons) */}
        {children}
      </div>
    </div>
  )
}
