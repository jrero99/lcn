import { Component } from 'react'
import ErrorLayout from './ErrorLayout.jsx'

// Catches render-time errors below it and shows a friendly fallback.
// Raw error details are only shown in development builds.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error(error)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <ErrorLayout
        title="Ups, algo no ha salido bien"
        message="Ha ocurrido un error inesperado. Prueba a recargar la página; si el problema continúa, vuelve al inicio."
        documentTitle="Error | La Casa Nostra"
        actions={
          <button type="button" className="btn btn-solid error-btn" onClick={() => window.location.reload()}>
            Recargar
          </button>
        }
      >
        {import.meta.env.DEV && <pre className="error-details">{String(error?.message ?? error)}</pre>}
      </ErrorLayout>
    )
  }
}
