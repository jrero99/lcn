import LegalPage from '../components/LegalPage.jsx'
import { BUSINESS } from '../data/business.js'

// Política de Cookies — exigida por el art. 22.2 de la LSSI-CE. Ajusta la tabla
// a las cookies que realmente use la web. Si se incorporan cookies analíticas o
// de terceros, será obligatorio mostrar además un banner de consentimiento.
const COOKIES = [
  {
    name: 'Cookies técnicas / de sesión',
    purpose: 'Permiten la navegación y el funcionamiento básico (carrito, sesión).',
    duration: 'Sesión',
    owner: 'Propia',
  },
  // Añade aquí cookies analíticas o de terceros si llegáis a usarlas (p. ej. Google Analytics).
]

export default function PoliticaCookies() {
  return (
    <LegalPage
      title="Política de Cookies"
      updated="junio de 2026"
      lead="Qué cookies utilizamos en este sitio web y cómo puedes gestionarlas."
    >
      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Una cookie es un pequeño archivo que se descarga en tu dispositivo al
        visitar determinadas páginas web y que permite, entre otras cosas,
        recordar tus preferencias o mantener tu sesión activa.
      </p>

      <h2>2. ¿Qué cookies utilizamos?</h2>
      <p>
        Actualmente este sitio utiliza únicamente cookies técnicas, necesarias para
        su funcionamiento, que están exentas de consentimiento. Si en el futuro se
        incorporan cookies analíticas o de terceros, se solicitará tu consentimiento
        previo mediante un aviso.
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Finalidad</th>
            <th>Duración</th>
            <th>Titular</th>
          </tr>
        </thead>
        <tbody>
          {COOKIES.map((c) => (
            <tr key={c.name}>
              <td>{c.name}</td>
              <td>{c.purpose}</td>
              <td>{c.duration}</td>
              <td>{c.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>3. ¿Cómo gestionar o desactivar las cookies?</h2>
      <p>
        Puedes permitir, bloquear o eliminar las cookies instaladas mediante la
        configuración de tu navegador. Ten en cuenta que desactivar las cookies
        técnicas puede afectar al correcto funcionamiento del sitio. Consulta la
        ayuda de tu navegador (Chrome, Firefox, Safari, Edge…) para gestionarlas.
      </p>

      <h2>4. Más información</h2>
      <p>
        Para cualquier duda sobre el uso de cookies puedes escribirnos a {BUSINESS.email}.
      </p>
    </LegalPage>
  )
}
