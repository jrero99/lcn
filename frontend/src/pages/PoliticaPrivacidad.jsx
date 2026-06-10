import LegalPage from '../components/LegalPage.jsx'
import { BUSINESS } from '../data/business.js'

// Política de Privacidad — información sobre el tratamiento de datos personales
// exigida por el RGPD (UE 2016/679) y la LOPDGDD (LO 3/2018).
export default function PoliticaPrivacidad() {
  return (
    <LegalPage
      title="Política de Privacidad"
      updated="junio de 2026"
      lead="Cómo tratamos tus datos personales cuando reservas, haces un pedido o creas una cuenta."
    >
      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li><strong>Responsable:</strong> {BUSINESS.legalName}</li>
        <li><strong>NIF/CIF:</strong> {BUSINESS.nif}</li>
        <li><strong>Domicilio:</strong> {BUSINESS.address}</li>
        <li><strong>Correo electrónico:</strong> {BUSINESS.email}</li>
      </ul>

      <h2>2. ¿Qué datos tratamos y con qué finalidad?</h2>
      <ul>
        <li>
          <strong>Reservas de mesa:</strong> nombre, teléfono y datos de la reserva
          (fecha, hora, número de comensales) para gestionar y confirmar la reserva.
        </li>
        <li>
          <strong>Pedidos online:</strong> nombre, teléfono, dirección de entrega y
          detalle del pedido para preparar y entregar la comida y gestionar el
          cobro contra reembolso.
        </li>
        <li>
          <strong>Cuenta de usuario:</strong> nombre, correo electrónico y
          contraseña (cifrada) para gestionar tu cuenta y el historial de pedidos y
          reservas.
        </li>
        <li>
          <strong>Atención al cliente:</strong> los datos que nos facilites al
          contactarnos, para atender tu consulta.
        </li>
        <li>
          <strong>Candidaturas de empleo:</strong> los datos del currículum que nos
          envíes, para participar en nuestros procesos de selección.
        </li>
      </ul>

      <h2>3. Base legal del tratamiento</h2>
      <ul>
        <li>
          <strong>Ejecución de un contrato:</strong> la gestión de reservas, pedidos
          y de tu cuenta de usuario.
        </li>
        <li>
          <strong>Consentimiento:</strong> el envío de comunicaciones comerciales (si
          lo autorizas) y la participación en procesos de selección.
        </li>
        <li>
          <strong>Obligación legal:</strong> el cumplimiento de obligaciones fiscales
          y contables.
        </li>
      </ul>

      <h2>4. ¿Durante cuánto tiempo conservamos los datos?</h2>
      <p>
        Conservamos los datos durante el tiempo necesario para prestar el servicio y,
        después, durante los plazos legalmente exigidos (por ejemplo, los fiscales y
        contables). Los currículums se conservan un máximo de un año salvo que nos
        autorices lo contrario.
      </p>

      <h2>5. ¿A quién comunicamos tus datos?</h2>
      <p>
        No cedemos tus datos a terceros salvo obligación legal. Únicamente acceden a
        ellos los proveedores que nos prestan servicios (por ejemplo, alojamiento web
        o, en su caso, reparto a domicilio), siempre como encargados del tratamiento y
        con las garantías exigidas por la normativa. No se realizan transferencias
        internacionales de datos fuera del Espacio Económico Europeo.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición,
        limitación del tratamiento y portabilidad escribiéndonos a {BUSINESS.email},
        indicando el derecho que deseas ejercer y adjuntando copia de un documento
        que acredite tu identidad.
      </p>
      <p>
        Si consideras que no hemos atendido correctamente tu solicitud, puedes
        presentar una reclamación ante la Agencia Española de Protección de Datos
        (AEPD), <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas para proteger tus datos. Las
        contraseñas se almacenan cifradas y nunca tenemos acceso a ellas en claro.
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        Este sitio no está dirigido a menores de 14 años. La venta de bebidas
        alcohólicas está reservada a mayores de 18 años.
      </p>
    </LegalPage>
  )
}
