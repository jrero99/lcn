import LegalPage from '../components/LegalPage.jsx'
import { BUSINESS } from '../data/business.js'

// Aviso Legal — información exigida por el art. 10 de la Ley 34/2002 (LSSI-CE)
// a todo prestador de servicios de la sociedad de la información (web con
// actividad económica).
export default function AvisoLegal() {
  return (
    <LegalPage
      title="Aviso Legal"
      updated="junio de 2026"
      lead="Información general sobre la titularidad y las condiciones de uso de este sitio web."
    >
      <h2>1. Datos identificativos del titular</h2>
      <p>
        En cumplimiento del deber de información recogido en el artículo 10 de la
        Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio
        Electrónico (LSSI-CE), se facilitan los siguientes datos:
      </p>
      <ul>
        <li><strong>Titular:</strong> {BUSINESS.legalName}</li>
        <li><strong>Nombre comercial:</strong> {BUSINESS.tradeName}</li>
        <li><strong>NIF/CIF:</strong> {BUSINESS.nif}</li>
        <li><strong>Domicilio:</strong> {BUSINESS.address}</li>
        <li><strong>Correo electrónico:</strong> {BUSINESS.email}</li>
        <li><strong>Teléfono:</strong> {BUSINESS.phone}</li>
        <li><strong>Datos registrales:</strong> {BUSINESS.registry}</li>
        <li><strong>Sitio web:</strong> {BUSINESS.domain}</li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        Este sitio web tiene por objeto dar a conocer los productos y servicios de
        {' '}{BUSINESS.tradeName}, así como permitir la realización de reservas de
        mesa y pedidos de comida para recogida o entrega a domicilio.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        El acceso y uso de este sitio atribuye la condición de usuario e implica la
        aceptación de las condiciones recogidas en este Aviso Legal. El usuario se
        compromete a hacer un uso adecuado de los contenidos y a no emplearlos para
        actividades ilícitas o que dañen los derechos e intereses de terceros.
      </p>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        Todos los contenidos del sitio (textos, fotografías, logotipos, diseño y
        código) son titularidad de {BUSINESS.legalName} o de terceros que han
        autorizado su uso, y están protegidos por la normativa de propiedad
        intelectual e industrial. Queda prohibida su reproducción, distribución o
        transformación sin autorización expresa.
      </p>

      <h2>5. Responsabilidad</h2>
      <p>
        El titular no se responsabiliza de los daños derivados de un uso indebido
        del sitio, ni de las interrupciones, errores u omisiones que puedan
        producirse. Se reserva el derecho a modificar, suspender o cancelar los
        contenidos y servicios en cualquier momento.
      </p>

      <h2>6. Enlaces externos</h2>
      <p>
        En caso de incluir enlaces a sitios de terceros, el titular no asume
        responsabilidad alguna sobre sus contenidos ni sobre el tratamiento que
        hagan de los datos personales.
      </p>

      <h2>7. Legislación aplicable</h2>
      <p>
        Este Aviso Legal se rige por la legislación española. Para la resolución de
        cualquier controversia, las partes se someten a los juzgados y tribunales
        que correspondan conforme a derecho.
      </p>
    </LegalPage>
  )
}
