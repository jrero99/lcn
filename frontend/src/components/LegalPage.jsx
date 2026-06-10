import { useEffect } from 'react'

// Layout reutilizable para páginas de texto largo (legales e informativas).
// Centra el contenido, fija un ancho de lectura cómodo y, al montar, sube el
// scroll al inicio para que la página no aparezca a media altura.
export default function LegalPage({ title, updated, lead, children }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <article className="legal-page">
      <header className="legal-head">
        <h1 className="legal-title">{title}</h1>
        {lead && <p className="legal-lead">{lead}</p>}
        {updated && (
          <p className="legal-updated">Última actualización: {updated}</p>
        )}
      </header>
      <div className="legal-body">{children}</div>
    </article>
  )
}
