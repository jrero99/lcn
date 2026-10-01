import ErrorLayout from '../components/ErrorLayout.jsx'

// 404 — catch-all route. Rendered inside the public Header/Footer layout.
export default function NotFound() {
  return (
    <ErrorLayout
      code="404"
      title="Vaya, esta página se ha quedado sin pan"
      message="No encontramos lo que buscas. Puede que el enlace esté roto o que la página ya no exista."
      documentTitle="Página no encontrada | La Casa Nostra"
    />
  )
}
