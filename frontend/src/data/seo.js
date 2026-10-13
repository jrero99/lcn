import { BUSINESS } from './business.js'

// Metadatos SEO por ruta. Los títulos/descripciones están pensados para el
// público local de Mataró. Las rutas privadas o funcionales llevan `noindex`.
export const SITE_NAME = BUSINESS.tradeName
export const SITE_URL = `https://${BUSINESS.domain}`
export const DEFAULT_OG_IMAGE = '/og-image.jpg'

export const SEO = {
  home: {
    title: 'La Casa Nostra | Bocadillería en Mataró',
    description:
      'Bocadillería en Mataró: bocadillos artesanos, carta con alérgenos, pedido online y reserva de mesa. Descubre La Casa Nostra.',
  },
  carta: {
    title: 'Carta de bocadillos y más | La Casa Nostra Mataró',
    description:
      'Consulta la carta de La Casa Nostra en Mataró: bocadillos, bebidas y extras, con la información de alérgenos de cada producto.',
  },
  reservar: {
    title: 'Reservar mesa en Mataró | La Casa Nostra',
    description:
      'Reserva mesa en La Casa Nostra, tu bocadillería en Mataró. Elige día, hora y número de comensales en pocos pasos.',
  },
  trabaja: {
    title: 'Trabaja con nosotros | La Casa Nostra Mataró',
    description:
      'Trabaja en La Casa Nostra, bocadillería en Mataró. Envíanos tu candidatura y únete a nuestro equipo.',
  },
  avisoLegal: {
    title: 'Aviso legal | La Casa Nostra',
    description:
      'Aviso legal de La Casa Nostra, bocadillería en Mataró: datos identificativos del titular y condiciones de uso de la web.',
  },
  politicaPrivacidad: {
    title: 'Política de privacidad | La Casa Nostra',
    description:
      'Política de privacidad de La Casa Nostra: cómo tratamos tus datos personales y cómo ejercer tus derechos RGPD.',
  },
  politicaCookies: {
    title: 'Política de cookies | La Casa Nostra',
    description: 'Información sobre las cookies que utiliza la web de La Casa Nostra, bocadillería en Mataró.',
  },
  condicionesVenta: {
    title: 'Condiciones de venta | La Casa Nostra',
    description:
      'Condiciones de venta de los pedidos online de La Casa Nostra en Mataró: recogida, entrega a domicilio y pago al recibir.',
  },
  // ── noindex: rutas privadas o funcionales ──────────────────────────────────
  hacerPedido: {
    title: 'Hacer pedido online | La Casa Nostra Mataró',
    description: 'Haz tu pedido online en La Casa Nostra, bocadillería en Mataró: recoge en el local o recíbelo en casa.',
    noindex: true,
  },
  pedidoDatos: {
    title: 'Datos del pedido | La Casa Nostra',
    description: 'Indica los datos de tu pedido en La Casa Nostra.',
    noindex: true,
  },
  pedidoCatalogo: {
    title: 'Elige tus bocadillos | La Casa Nostra',
    description: 'Elige tus bocadillos, bebidas y extras para tu pedido en La Casa Nostra.',
    noindex: true,
  },
  pedidoConfirmar: {
    title: 'Confirmar pedido | La Casa Nostra',
    description: 'Revisa y confirma tu pedido en La Casa Nostra. Pago al recibir.',
    noindex: true,
  },
  login: {
    title: 'Iniciar sesión | La Casa Nostra',
    description: 'Accede a tu cuenta de La Casa Nostra para hacer pedidos online.',
    noindex: true,
  },
  registro: {
    title: 'Crear cuenta | La Casa Nostra',
    description: 'Crea tu cuenta en La Casa Nostra para hacer pedidos online.',
    noindex: true,
  },
  misDirecciones: {
    title: 'Mis direcciones | La Casa Nostra',
    description: 'Gestiona tus direcciones de entrega en La Casa Nostra.',
    noindex: true,
  },
  admin: {
    title: 'Panel de administración | La Casa Nostra',
    description: 'Panel de administración de La Casa Nostra.',
    noindex: true,
  },
  notFound: {
    title: 'Página no encontrada | La Casa Nostra',
    description: 'La página que buscas no existe. Vuelve al inicio de La Casa Nostra, bocadillería en Mataró.',
    noindex: true,
  },
}
