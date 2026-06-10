import LegalPage from '../components/LegalPage.jsx'
import { BUSINESS } from '../data/business.js'

// Condiciones de Venta — condiciones generales de contratación para los pedidos
// online (RDL 1/2007, Ley General para la Defensa de Consumidores y Usuarios, y
// LSSI-CE). Importante: los alimentos perecederos están EXENTOS del derecho de
// desistimiento (art. 103.d RDL 1/2007).
export default function CondicionesVenta() {
  return (
    <LegalPage
      title="Condiciones de Venta"
      updated="junio de 2026"
      lead="Condiciones aplicables a los pedidos de comida realizados a través de esta web."
    >
      <h2>1. Vendedor</h2>
      <ul>
        <li><strong>Titular:</strong> {BUSINESS.legalName}</li>
        <li><strong>NIF/CIF:</strong> {BUSINESS.nif}</li>
        <li><strong>Domicilio:</strong> {BUSINESS.address}</li>
        <li><strong>Contacto:</strong> {BUSINESS.email} · {BUSINESS.phone}</li>
      </ul>

      <h2>2. Productos y precios</h2>
      <p>
        Los productos ofrecidos son los que figuran en la carta de la web. Los
        precios se muestran en euros con el IVA incluido. Nos reservamos el derecho a
        modificar la carta y los precios; el precio aplicable será el vigente en el
        momento de realizar el pedido.
      </p>

      <h2>3. Realización del pedido</h2>
      <p>
        Para realizar un pedido debes seleccionar los productos, elegir la modalidad
        (recogida en el local o entrega a domicilio), facilitar los datos
        necesarios y confirmar. Tras la confirmación recibirás un resumen del pedido.
        El pedido se considera aceptado cuando lo confirmamos.
      </p>

      <h2>4. Formas de pago</h2>
      <p>
        El pago se realiza <strong>contra reembolso</strong> en el momento de la
        entrega o de la recogida, en efectivo o con tarjeta. No se realizan cobros
        online a través de esta web.
      </p>

      <h2>5. Entrega y plazos</h2>
      <p>
        La entrega a domicilio está disponible dentro de nuestra zona de reparto. Los
        plazos de entrega son orientativos y dependen del volumen de pedidos. En la
        modalidad de recogida, el pedido estará disponible en el local en el horario
        indicado. Los gastos de envío, si los hubiera, se muestran antes de confirmar
        el pedido.
      </p>

      <h2>6. Pedido mínimo y zona de reparto</h2>
      <p>
        Podrá aplicarse un importe mínimo de pedido y unas zonas de reparto
        determinadas, que se indicarán durante el proceso de compra.
      </p>

      <h2>7. Derecho de desistimiento</h2>
      <p>
        De acuerdo con el artículo 103 del Real Decreto Legislativo 1/2007, los
        productos alimenticios elaborados y perecederos están <strong>exentos del
        derecho de desistimiento</strong>, por lo que no se admiten devoluciones una
        vez confirmado y preparado el pedido, salvo en caso de error o de producto en
        mal estado.
      </p>

      <h2>8. Cancelaciones, incidencias y reclamaciones</h2>
      <p>
        Si hay algún problema con tu pedido (error, producto incorrecto o en mal
        estado), contáctanos lo antes posible en {BUSINESS.email} o {BUSINESS.phone} y
        lo resolveremos. Disponemos de hojas oficiales de reclamación a disposición de
        los consumidores.
      </p>

      <h2>9. Venta de alcohol</h2>
      <p>
        La venta y entrega de bebidas alcohólicas está reservada a personas mayores de
        18 años. Podrá solicitarse un documento acreditativo de la edad en el momento
        de la entrega.
      </p>

      <h2>10. Alérgenos</h2>
      <p>
        La información sobre alérgenos de cada producto está disponible en la carta. Si
        tienes alguna alergia o intolerancia, consúltanos antes de realizar el pedido.
      </p>

      <h2>11. Legislación y resolución de conflictos</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Como consumidor,
        puedes acudir a la plataforma europea de resolución de litigios en línea:
        {' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>.
      </p>
    </LegalPage>
  )
}
