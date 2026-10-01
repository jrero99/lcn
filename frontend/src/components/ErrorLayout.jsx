import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ORDERS_ENABLED } from '../config/features.js'

// Shared visual shell for the 404 page and the runtime-error fallback.
// Sets the document title and moves focus to the heading on mount so screen
// reader users are told what happened after the route/render change.
export default function ErrorLayout({ code, title, message, documentTitle, actions, children }) {
  const headingRef = useRef(null)

  useEffect(() => {
    const previous = document.title
    document.title = documentTitle
    headingRef.current?.focus()
    return () => {
      document.title = previous
    }
  }, [documentTitle])

  return (
    <section className="error-page">
      {code && (
        <p className="error-code" aria-hidden="true">
          {code}
        </p>
      )}
      <h1 className="error-title" tabIndex={-1} ref={headingRef}>
        {title}
      </h1>
      <p className="error-message">{message}</p>
      <div className="error-actions">
        {actions}
        <Link to="/" className="btn btn-outline error-btn">
          Volver al inicio
        </Link>
        <Link to={ORDERS_ENABLED ? '/hacer-pedido' : '/carta'} className="btn btn-solid error-btn">
          {ORDERS_ENABLED ? 'Hacer pedido' : 'Ver la carta'}
        </Link>
      </div>
      {children}
    </section>
  )
}
