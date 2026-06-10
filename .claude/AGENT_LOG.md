# AGENT_LOG — Registro vivo de cambios entre agentes

> **Propósito**: este es el canal de comunicación entre los agentes del proyecto.
> Cada agente apunta aquí los cambios relevantes que hace. El
> `knowledge-coordinator` lee este registro, resume el estado y mantiene al resto
> de agentes al día.

## Cómo anotar un cambio

Añade una entrada **al principio** de la sección "Bitácora" con este formato:

```
### [YYYY-MM-DD] <agente> — <título corto>
- **Qué cambió**: ...
- **Por qué**: ...
- **Impacto para otros agentes**: (p.ej. "frontend debe actualizar el service de auth")
- **Acción requerida**: (o "ninguna")
```

Anota un cambio cuando: creas/modificas un endpoint, cambias el contrato de la
API (request/response), añades una dependencia, tomas una decisión de
arquitectura, cambias el modelo de datos, o detectas un riesgo de seguridad/QA.

---

## Estado consolidado (mantiene `knowledge-coordinator`)
_Última consolidación: 2026-06-10_

### Contratos de API vigentes
Ningún endpoint implementado aún. Contratos pendientes de definir cuando se andamie el backend:

| Método | Ruta | Body (request) | Respuesta esperada | Estado |
|--------|------|----------------|--------------------|--------|
| GET | `/api/catalog` | — | `[{ id, name, description, price, allergens[], options[] }]` | Pendiente. Forma exacta documentada en `catalogMockData.js`. |
| POST | `/api/orders` | `{ items[], total, mode, address?, paymentMethod }` | `{ orderId, confirmationTitle?, confirmationMessage? }` | Pendiente. `confirmationTitle`/`confirmationMessage` son opcionales; el front los pasa como props al `Modal` con defaults si ausentes. |
| POST | `/api/reservations` | `{ date, time, zone, guests }` | `{ availableSlots[] }` | Pendiente. Punto de integración marcado con `// TODO` en `Reservas.jsx`. |

### Modelo de datos vigente
_(BD por andamiar. Stack decidido: PostgreSQL + Prisma.)_
- El pedido debe incluir campo `paymentMethod` (CARD / CASH) — pago al recibir, sin cobro online.
- Catálogo: campo `options` por producto (grupos de opciones con nombre e items seleccionables). Ver `catalogMockData.js` para estructura exacta.

### Decisiones de arquitectura
- Stack: React (front) + Node/Express (back).
- **BD: PostgreSQL + Prisma (ORM).**
- **Pago: sin pasarela online.** Contra reembolso (tarjeta o efectivo al repartidor). El pedido guarda el método elegido; no hay cobro en la web.
- **Hosting: frontend en GitHub Pages** (https://jrero99.github.io/lcn/) vía GitHub Actions (`.github/workflows/deploy.yml`). Backend sin despliegue por ahora (sigue local).
- **Modales en el front**: existe un `Modal` genérico y accesible en `frontend/src/components/Modal.jsx`. Reusar para todos los diálogos/confirmaciones; no crear modales ad-hoc nuevos.
- **Separación de clases CSS de modales**: `ProductModal` (bottom-sheet) usa `.product-modal-backdrop`; `Modal` genérico usa `.modal-backdrop`. Nombres distintos para evitar conflicto de cascada.

### Deuda / riesgos abiertos
- Número de WhatsApp real del negocio pendiente (placeholder `34XXXXXXXXX` en `Reservas.jsx`).
- Imágenes reales pendientes: hero, polaroids de la carta (3 fotos). La foto del local ya está integrada (`local.png`; pendiente optimización a `.webp`).
- Fuente Salo sin auto-alojar (`@font-face` comentado en `index.css`; archivos ausentes en `assets/fonts/`).
- Páginas Login y Registro sin construir; enlace "Iniciar Sesión" en el header apunta a `#` con TODO.
- El keying del carrito es por `product.id` — variantes de opciones no generan líneas separadas (TODO en `OrderCatalog.jsx`).
- Modal de HORAS DISPONIBLES en el flujo de reservas es iteración futura (TODO en `Reservas.jsx`).

---

## Bitácora

### [2026-06-10] frontend-react — Foto real del local integrada en Home

- **Qué cambió**:
  - `frontend/src/assets/local.png` — imagen real del local añadida al repositorio (PNG 850×691, ~1 MB). El archivo original del usuario era "Mask group.png"; renombrado a `local.png`.
  - `frontend/src/pages/Home.jsx` — añadido `import localPhoto from '../assets/local.png'`. El `<div className="placeholder media-photo">` (placeholder previo) sustituido por `<img src={localPhoto} alt="Terraza y entrada de La Casa Nostra en Mataró" className="media-photo" />`. Sin `role` redundante (accesible).
  - `frontend/src/index.css` — añadida regla `img.media-photo { width:100%; height:100%; object-fit:cover; display:block; }` para que la imagen rellene la caja sin deformarse. La regla compartida `.media-photo, .media-box` (min-height + border-radius) se mantiene sin cambios.
  - Build verificado: `vite build` compila OK; la imagen se empaqueta en `dist/assets`.

- **Por qué**: El usuario aportó la primera imagen real del negocio.

- **Impacto para otros agentes**:
  - `testing-expert`: si hay tests de snapshot o de renderizado del `Home`, actualizar el snapshot para reflejar el `<img>` en lugar del `<div className="placeholder">`.
  - `qa-expert`: verificar en dispositivo real que la imagen se muestra correcta y que el `alt` es legible por lectores de pantalla.

- **Acción requerida**:
  - `frontend-react` (tarea futura): optimizar `local.png` (~1 MB) convirtiéndola a `.webp` o comprimiéndola para mejorar la carga en móvil.
  - Siguen siendo placeholders pendientes de imagen real: sección hero (`hero-media`), polaroids de la carta (3 fotos) y los `media-box`.

### [2026-06-10] knowledge-coordinator — Consolidación 2026-06-10: foto real del local

- **Qué cambió**: Registrada la integración de la primera imagen real (`local.png`) en Home. Actualizado `CLAUDE.md` sección 7 para reflejar que la imagen del local ya no es un placeholder.
- **Por qué**: Consolidación rutinaria tras cambio de frontend.
- **Impacto para otros agentes**: Ver entrada anterior (`frontend-react — Foto real del local`).
- **Acción requerida**: Ninguna nueva. Ver deuda de optimización de imagen anotada arriba.

### [2026-06-10] frontend-react — Auditoría de navegación y responsive: correcciones

- **Qué cambió**:

  **EJE 1 — Navegación**
  - `frontend/src/pages/Home.jsx:81` — `href="#empleo"` corregido a `href="#trabaja"` (el id real de la sección de empleo en Home).
  - `frontend/src/components/Header.jsx` — `NAV_LINKS`: `{ label: 'Iniciar Sesión', href: '/#login' }` → `href: '#'` con comentario `// TODO: ruta /login cuando exista la página`. El enlace `/#login` apuntaba a una ancla/página inexistente.
  - `frontend/src/components/Footer.jsx` — Columna "Páginas" reescrita. Antes todos los items eran `<a href="#">`. Ahora:
    - "Hacer pedido" → `<Link to="/hacer-pedido">` (ruta interna SPA)
    - "Reservar" → `<Link to="/reservar">` (ruta interna SPA)
    - "La Carta" → `<a href="/#carta">` (ancla a Home, id existente)
    - "Trabaja con Nosotros" → `<a href="/#trabaja">` (ancla a Home, id existente)
    - "Política de Privacidad", "Aviso Legal", "Política de Cookies", "Condiciones de venta" → siguen como `href="#"` con comentario `// TODO` (páginas no construidas todavía).
    - Añadido `import { Link } from 'react-router-dom'`.

  **EJE 2 — Responsive / CSS**
  - `frontend/src/index.css` — **Bug crítico resuelto**: `.modal-backdrop` estaba definido dos veces (una para `ProductModal`, otra para `Modal`). La segunda definición sobreescribía `align-items: flex-end` de la primera, rompiendo el comportamiento de bottom-sheet del `ProductModal`. Solución: renombrado el backdrop de `ProductModal` a `.product-modal-backdrop` (y actualizado `ProductModal.jsx` para usarlo). También renombradas las `@keyframes` correspondientes a `product-backdrop-fade-in` y `product-modal-slide-up` para evitar conflictos de nombre.
  - `frontend/src/index.css` — `@keyframes modal-slide-up` del bloque genérico (`Modal`) renombrado a `modal-panel-slide-up` (antes coincidía en nombre con el del ProductModal, el último definido ganaba la cascada).
  - `frontend/src/index.css` — `modal-close-btn` (botón X del ProductModal): era 36×36px en todos los tamaños. Añadida regla en `@media (max-width: 520px)` para subir a 44×44px (tap target mínimo en móvil).
  - `frontend/src/index.css` — `.checkout-bar-change-btn`: añadida regla `min-height: 44px` en `@media (max-width: 520px)` para garantizar el tap target mínimo en móvil.

- **Por qué**: Auditoría de calidad (navegación + responsive) sobre lo ya construido. Sin features nuevas.

- **Impacto para otros agentes**:
  - `testing-expert`: al probar el `ProductModal` (bottom sheet en móvil), asegurarse de que el componente usa `.product-modal-backdrop`, no `.modal-backdrop`.
  - `qa-expert`: verificar en 360px que el bottom-sheet del ProductModal se muestra correctamente (antes estaba centrado en vez de en la parte inferior por el conflicto de CSS).

- **Acción requerida**: `qa-expert` puede verificar en DevTools los dos contextos de modal (ProductModal bottom-sheet vs Modal genérico centrado).

### [2026-06-10] frontend-react — Página Reservas: paso 1 del flujo de reservas

- **Qué cambió**:
  - Nueva página `frontend/src/pages/Reservas.jsx` — paso 1 del flujo de reservas (formulario de búsqueda de mesa). Campos: fecha (input date), hora (select con franjas 13:00–22:30 cada 30 min), zona (Interior / Terraza / Barra) y número de personas (1–6). Botón "Buscar mesa" con validación de campo + estado "Buscando mesas disponibles…". Botón WhatsApp para grupos ≥7. Todos los datos son mock (sin API).
  - `frontend/src/App.jsx` — nueva ruta `/reservar` → `<Reservas />`.
  - `frontend/src/components/Header.jsx` — botón "Reservar" cambiado de `<a href="/#reservar">` a `<Link to="/reservar">`.
  - `frontend/src/index.css` — nuevas clases con prefijo `reservas-` (~100 líneas): `.reservas`, `.reservas-inner`, `.reservas-title`, `.reservas-sub`, `.reservas-form`, `.reservas-grid` (2 cols → 1 col en ≤860px), `.reservas-field` (pill icon+input/select, height 52px), `.reservas-search-btn`, `.reservas-searching-hint`, `.reservas-divider`, `.reservas-group-text`, `.reservas-whatsapp-btn`. Build verificado OK.

- **Por qué**: Petición explícita del usuario.

- **Impacto para otros agentes**:
  - `backend-node`: cuando se construya la API de reservas, el contrato mínimo necesario será `POST /api/reservations` con body `{ date, time, zone, guests }` y respuesta con `availableSlots[]`. Hay un `// TODO: abrir modal HORAS DISPONIBLES (iteración futura)` en el componente marcando el punto de integración.
  - `testing-expert`: flujo crítico a cubrir: (1) submit con campos vacíos → muestra los 4 errores; (2) submit completo → estado "Buscando"; (3) cambiar un campo tras submit → limpia ese error.
  - `qa-expert`: revisar en 360px que el grid de 1 columna no desborda, que targets táctiles son ≥44px, y que el botón WhatsApp abre `target="_blank"`.

- **Acción requerida**:
  - `backend-node` debe definir el contrato de `POST /api/reservations` cuando andamie el backend.
  - El número de WhatsApp real está pendiente de que el negocio lo proporcione (placeholder `34XXXXXXXXX` en el componente).
  - El modal de HORAS DISPONIBLES y el paso de email de confirmación son iteraciones futuras.

### [2026-06-10] frontend-react — Ficha de producto (modal) + tarjetas sin imagen + campo `options` mock

- **Qué cambió**:
  - `frontend/src/components/ProductModal.jsx` (nuevo) — modal de detalle de producto. Una sola columna de contenido (sin imagen): nombre (Salo, mayúsculas), descripción, alérgenos (requisito legal UE), grupos de opciones (`fieldset`+`legend`+`input[type=radio]`) y pie sticky con precio + botón "Añadir al pedido". Accesible: `role="dialog"` `aria-modal="true"` `aria-labelledby`, foco inicial en el botón X, foco atrapado (Tab/Shift+Tab), devolución de foco al cerrar, bloqueo de scroll del body, cierre con Escape o clic en el backdrop. Animación de entrada (bottom sheet en móvil, centrado en ≥560px); respeta `prefers-reduced-motion`. Selección por defecto: primera opción de cada grupo.
  - `frontend/src/components/ProductCard.jsx` (reescrito) — tarjeta texto-only, sin imagen ni placeholder. Layout en columna: nombre, descripción, alérgenos, y al pie un `.product-card-footer` con precio a la izquierda y botón "+" a la derecha. La tarjeta completa es clicable (`role="button"` + `tabIndex={0}` + `onKeyDown Enter/Space`) → abre el modal via prop `onOpen`. El botón "+" usa `stopPropagation` para añadir 1 unidad al carrito directamente sin abrir el modal.
  - `frontend/src/data/catalogMockData.js` (actualizado) — añadido campo `options` (mock) en los 4 productos de la categoría `burgers`. Grupos: "Elige tu acompañante" (Bravas / Fritas) y "Elige tu salsa" (Brava / Alioli / BBQ / César / Mostaza y miel / Sin salsa). El resto de categorías no tienen `options`. Comentario TODO con la forma exacta que deberá devolver `GET /api/catalog`.
  - `frontend/src/pages/OrderCatalog.jsx` (actualizado) — añadido estado `selectedProduct`, callbacks `handleOpenProduct`/`handleCloseModal`, prop `onOpen` a `ProductCard`, renderizado condicional de `<ProductModal>`. `handleAddToCart` acepta `(product, _options)` — las opciones se capturan pero el keying del carrito sigue siendo por `product.id` (TODO documentado).
  - `frontend/src/index.css` — estilos del modal (`.modal-backdrop`, `.product-modal`, `.modal-close-btn`, `.modal-body`, `.modal-product-*`, `.modal-option-group`, `.radio-option` en pill con indicador redondo de marca, `.modal-footer`). Sección `.product-card` reescrita: layout en columna, `.product-card-footer` flex, botón "+" in-flow. Eliminadas reglas de imagen. Build verificado OK.

- **Por qué**: El usuario pidió ficha de producto modal sin imagen + rediseño de tarjetas sin foto.

- **Impacto para otros agentes**:
  - `backend-node`: `GET /api/catalog` deberá incluir el campo `options` por producto. Forma exacta documentada en `catalogMockData.js` con comentario TODO.
  - `testing-expert`: flujos a cubrir: (1) click tarjeta abre modal; (2) botón "+" añade sin abrir modal; (3) Escape/backdrop cierra; (4) foco vuelve al opener; (5) selección de opciones funciona; (6) "Añadir al pedido" suma al carrito y cierra.
  - `qa-expert`: revisar bottom sheet en móvil, tarjeta centrada en ≥560px, `prefers-reduced-motion`.

- **Acción requerida**:
  - `backend-node`: añadir campo `options` al contrato de `GET /api/catalog`.
  - `testing-expert`: escribir tests de los flujos del modal.

### [2026-06-10] frontend-react — Modal reutilizable de confirmación de pedido

- **Qué cambió**:
  - Nuevo componente `frontend/src/components/Modal.jsx` — modal genérico y accesible.
    Props: `isOpen` (boolean), `onClose` (function), `title` (string, default "¡GRACIAS POR TU PEDIDO!"), `message` (string, default texto de confirmación estándar), `children` (nodo React opcional para contenido extra).
    Usa variables CSS de marca (`var(--brand)`, `var(--font-heading)`) — nada hardcodeado.
    Accesibilidad: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap básico, cierre con Escape y click en backdrop.
    Bloquea scroll del body mientras está abierto.
    Responsive sin overflow horizontal; animación de fade/slide respeta `prefers-reduced-motion`.
  - `frontend/src/index.css` — Nuevas clases `.modal-backdrop`, `.modal-panel`, `.modal-close`, `.modal-title`, `.modal-message` añadidas antes del bloque RESPONSIVE (z-index 200, por encima del header y la checkout-bar).
  - `frontend/src/pages/OrderConfirmation.jsx` — Integra el Modal: se abre automáticamente al llegar a la página de confirmación. El estado `modalOpen` lo controla. Preparado para recibir `title` y `message` desde la respuesta de la API futura sin modificar el componente.
  - `frontend/src/pages/Home.jsx` — Corregida rotura de build pre-existente: eliminado el import de `../assets/local.jpg` (imagen ausente) y sustituido el `<img>` por un `<div className="placeholder media-box">` consistente con el resto de placeholders del proyecto.

- **Por qué**: Petición explícita del usuario. El modal cubre la necesidad actual (texto por defecto) y está preparado para recibir contenido dinámico de la API.

- **Impacto para otros agentes**:
  - `backend-node`: cuando `POST /api/orders` exista, puede devolver `confirmationTitle` y `confirmationMessage` en la respuesta. El frontend solo necesita pasarlos como props al Modal (ver comentario en `OrderConfirmation.jsx`).
  - `testing-expert`: flujo crítico a cubrir: `OrderConfirmation` monta → modal visible → foco en botón cerrar → Escape cierra → backdrop click cierra → scroll del body restaurado.
  - `qa-expert`: revisar modal en móvil (360px), que no haya overflow y que el título no solape el botón de cierre.

- **Acción requerida**: `backend-node` puede incluir `confirmationTitle`/`confirmationMessage` en la respuesta de `POST /api/orders` cuando lo andamie. `testing-expert` añadir tests del ciclo open/close del modal.

### [2026-06-09] knowledge-coordinator — Deploy a GitHub Pages + estado frontend consolidado

- **Qué cambió**:
  - Decisión de hosting actualizada: el frontend se despliega a GitHub Pages (https://jrero99.github.io/lcn/) mediante GitHub Actions (commit fbcafb9).
  - Workflow `.github/workflows/deploy.yml`: se activa en push a `main` y con `workflow_dispatch`. Pasos: `npm ci` + `npm run build` en `frontend/`, copia `dist/index.html` → `dist/404.html` (fallback SPA para React Router), publica con `actions/deploy-pages`.
  - `frontend/vite.config.js`: `base: process.env.GITHUB_ACTIONS ? '/lcn/' : '/'` — en local sigue siendo `/`.
  - React Router configurado con `basename` para funcionar bajo `/lcn/`.
  - `CLAUDE.md` actualizado: tabla de stack (fila Hosting), bloque "Decisiones confirmadas" y sección 7 "Estado actual".
- **Por qué**: Decisión confirmada por el usuario hoy.
- **Impacto para otros agentes**:
  - `frontend-react`: todos los `Link` y rutas ya funcionan bajo `/lcn/` gracias al `basename`. Si se añaden assets con rutas absolutas, deben usar `import.meta.env.BASE_URL` (Vite).
  - `testing-expert`: los tests de rutas deben pasarle `basename="/lcn"` al `MemoryRouter` / `createMemoryRouter` para ser consistentes con producción.
  - `backend-node`: sin impacto directo (el backend no se despliega).
- **Acción requerida**: `testing-expert` debe tener en cuenta el `basename` al escribir tests de navegación.

### [2026-06-09] frontend-react — Responsive audit: tablet & mobile pass

- **Qué cambió**:
  - `frontend/src/index.css` — Sección responsive reescrita. Breakpoints definidos: `860px` (tablet), `520px` (mobile), `400px` (small phones).
  - `frontend/src/components/Header.jsx` — Menú hamburguesa accesible para ≤860px: botón con `aria-expanded`, panel desplegable con `order:3`+`width:100%`, cierre con Escape y en cambio de ruta. `ResizeObserver` sincroniza `--header-h` en `:root` con la altura real del header (incluyendo cuando el menú está abierto).

- **Problemas corregidos**:
  1. `.cat-nav` `top: 68px` fijo → `top: var(--header-h)`. La variable se actualiza via JS (`ResizeObserver` en `Header.jsx`) para reflejar la altura real del header en cualquier estado (abierto/cerrado, cualquier breakpoint). Valor por defecto CSS: `68px` (cubre el flash antes de que el JS cargue).
  2. `.footer-wordmark` `white-space:nowrap` + overflow → ahora con `font-size: clamp(2rem, 16vw, 13rem)` escalado conservador; a 360px `16vw ≈ 57.6px` → encaja perfectamente. Tamaño mínimo reducido de 3rem a 2rem. Añadido `max-width:100%`. En ≤520px se reduce a `clamp(1.8rem, 14vw, 4rem)`.
  3. Header mobile → menú hamburguesa reemplaza el flex-wrap a 3 filas: logo + acciones + botón hamburguesa en una sola fila compacta; los nav-links como panel desplegable full-width.

- **Otros arreglos de la auditoría**:
  - Botón `+` de `ProductCard`: 32px → 40px (tablet) → 44px (móvil). Cumple target táctil mínimo de 44px.
  - `cat-nav-tab`: padding aumentado en ≤520px → tap target ≥44px.
  - Inputs `PedidoDatos`: `font-size: 1rem` (16px) en ≤860px para prevenir zoom automático de iOS.
  - Polaroids home: en ≤520px, width reclampeada a `clamp(95px, 26vw, 160px)` para que los 3 quepan sin overflow horizontal a 360px.
  - `.checkout-bar` apilada en ≤860px: `padding-bottom` del `.order-catalog` aumentado de `90px` a `130px` para compensar la barra más alta al apilarse.
  - Botón "Reservar" del header se oculta en ≤520px (demasiado espacio para pantallas pequeñas); "Hacer pedido" permanece visible como CTA principal.
  - `.confirm-actions`: `flex-wrap: wrap` ya existía; añadido `flex-direction: column` en ≤520px para stackear botones.
  - `.order-card` `min-height` reducida a 220px (tablet) y 180px (≤400px).
  - `prefers-reduced-motion`: respetado (hamburguesa no tiene animación CSS; marquee ya tenía el bloque existente).

- **Por qué**: Petición explícita de auditoría responsive completa.
- **Impacto para otros agentes**: Ninguno. Solo cambios de presentación en frontend.
- **Acción requerida**: Ninguna. Probar manualmente en DevTools (360px, 414px, 768px) y en dispositivo real iOS/Android.

### [2026-06-09] frontend-react — Enlaces del flujo de pedido conectados de extremo a extremo
- **Qué cambió**: Resuelto el TODO de "datos antes o después del catálogo". Decidido **datos ANTES** (la `CheckoutBar` muestra la dirección durante el catálogo + el diseño original iba elegir→datos). Flujo coherente: `/hacer-pedido` (elegir) → `/hacer-pedido/datos?mode=` (PedidoDatos) → `/hacer-pedido/{mode}` (OrderCatalog) → `/hacer-pedido/confirmar` (OrderConfirmation, nueva).
  - `HacerPedido`: tarjetas → `/hacer-pedido/datos?mode=recoger|domicilio`.
  - `PedidoDatos`: lee `mode` de query param (`useSearchParams`); "Continuar" → `/hacer-pedido/${mode}`. Corregido el enlace roto que iba a `/hacer-pedido/carta` (inexistente).
  - `OrderCatalog`: `handleCheckout` (antes console.log) → `/hacer-pedido/confirmar` con items+total; `handleChangeAddress` (antes console.log) → `/hacer-pedido/datos?mode=`.
  - Nueva `pages/OrderConfirmation.jsx`: resumen + nota de pago contra reembolso + enlaces (inicio / hacer otro pedido). Ruta `/hacer-pedido/confirmar` en `App.jsx` (rutas de OrderCatalog conservadas intactas).
  - `Home`: "Descubre nuestra carta completa" → `Link` a `/hacer-pedido` (antes ancla muerta `#carta-completa`).
  - Build OK.
- **Enlaces que siguen siendo placeholder** (páginas no construidas): header "Iniciar Sesión" (`/#login`) y "Reservar" (`/#reservar`); home "Únete al equipo" (`#empleo`). Header "La Carta"/"Trabaja" hacen scroll a secciones de la home (funcionan).
- **Acción requerida**: Confirmar el orden datos→catálogo (puedo invertirlo si se prefiere). Decidir si se construyen Login y Reservar.

### [2026-06-09] frontend-react — Pàgina OrderCatalog (catàleg de comanda)
- **Qué cambió**:
  - Nueva página `frontend/src/pages/OrderCatalog.jsx` — paso del catálogo en el flujo de pedido. Recibe prop `mode` ("recoger" | "domicilio"). Gestiona estado local del carrito (useState) y categoría activa.
  - Nuevos componentes: `frontend/src/components/CategoryNav.jsx` (barra sticky de pestañas con scroll horizontal), `frontend/src/components/ProductCard.jsx` (tarjeta de producto con imagen placeholder, alérgenos y botón "+"), `frontend/src/components/CheckoutBar.jsx` (barra fija en la parte inferior con dirección, total y botón finalizar).
  - Mock data del catálogo en `frontend/src/data/catalogMockData.js` — 13 categorías (Clàssics, Tapes, Hamburgueses, Vegetarians, Pollastres, Sandvitxos, Americanes, Solomillo de porc, Lloms, Amanides, Plats combinats, Postres, Begudes), varios productos por categoría, campo `allergens[]` (requisito legal UE).
  - Estilos nuevos en `frontend/src/index.css` (sección `Pàgina: Catàleg de comanda`): cat-nav sticky, product-grid 3 cols → 2 (tablet ≤860px) → 1 (móvil ≤520px), product-card con imagen y botón "+", checkout-bar fixed.
  - `App.jsx` actualizado: `/hacer-pedido/recoger` y `/hacer-pedido/domicilio` apuntan ahora a `<OrderCatalog>`. `PedidoDatos` se mueve a `/hacer-pedido/datos` (sin enlace directo activo). Build Vite verificado OK.
- **Por qué**: El usuario solicitó construir la pantalla de catálogo fiel a su mockup.
- **Impacto para otros agentes**:
  - `backend-node`: Catálogo usa mock data. Pendiente definir `GET /api/catalog` (campos mínimos: `id, name, description, price, allergens[]`). Coordinar contrato antes de integrar.
  - `backend-node`: Carrito y total son locales. Al confirmar habrá que llamar a `POST /api/orders`. Coordinar contrato de pedido.
  - `qa-expert`: Flujo crítico a revisar: cambio de categoría + scroll, añadir productos, acumulación del total, barra checkout, responsive móvil.
- **TODOs pendientes en código**:
  - `CheckoutBar`: botón "Canviar" → console.log (pendiente modal/navegación real).
  - `CheckoutBar`: botón "Finalitzar comanda" → console.log (pendiente ruta `/hacer-pedido/confirmar`).
  - Dirección en la barra es un mock literal; conectar con perfil del usuario cuando exista auth.
  - `PedidoDatos` (captura dirección/timing) está en `/hacer-pedido/datos` sin enlace; hay que reintegrar en el flujo una vez se decida el orden (antes o después del catálogo).
- **Acción requerida**: `backend-node` debe definir el contrato de `GET /api/catalog`. `qa-expert` puede revisar flujo de catálogo.

### [2026-06-09] frontend-react — Paso "Introduce tus datos" del pedido
- **Qué cambió**: Nueva `pages/PedidoDatos.jsx` (pantalla de datos): campo dirección con icono de pin + botón "Usar mi ubicación" (geolocalización del navegador), grupos de opciones "¿Cuándo quieres recoger/recibir?" (Programar / Lo antes posible + hora estimada dinámica = ahora+25min) y "¿Eres mayor de 18 años?" (Sí/No), validación en submit y botón "Continuar". Rutas nuevas en `App.jsx`: `/hacer-pedido/recoger` y `/hacer-pedido/domicilio` (misma página, prop `mode` cambia el texto), más placeholder `/hacer-pedido/carta` ("en construcción") al que lleva Continuar. Build OK.
- **Por qué**: El usuario pidió esta pantalla del flujo a partir de un diseño.
- **Pendientes / impacto**:
  - "Continuar" pasa los datos por `navigate(state)` a `/hacer-pedido/carta`, que es un placeholder. Falta la pantalla de selección de productos (la carta) — siguiente paso.
  - "Usar mi ubicación" solo rellena coordenadas (sin reverse-geocoding; eso requeriría API/servicio externo).
  - Las opciones son selección única (radio) aunque visualmente son casillas, como en el diseño.
  - `backend-node`: cuando exista el flujo real, el pedido necesitará: modo (recoger/domicilio), dirección, programación horaria y verificación de edad.
- **Acción requerida**: Aportar diseño de la pantalla de la carta/selección de productos.

### [2026-06-09] frontend-react — Routing + página "Hacer pedido"
- **Qué cambió**: Añadido **React Router** (`react-router-dom`). `main.jsx` envuelve en `BrowserRouter`; `App.jsx` define rutas: `/` (Home) y `/hacer-pedido` (nueva). Header: logo → `/`, botón "Hacer pedido" → `/hacer-pedido` (Link). Nueva `pages/HacerPedido.jsx`: dos tarjetas de elección (Recoger en el local / Recibir en casa) con borde de marca, enlazan a rutas de siguiente paso aún inexistentes. CSS añadido. Build OK.
- **Por qué**: El usuario pidió la página de hacer pedido a partir de un diseño.
- **Pendientes / impacto**:
  - Las tarjetas apuntan a `/hacer-pedido/recoger` y `/hacer-pedido/domicilio` (aún sin crear) — son el siguiente paso del flujo.
  - El texto "código: GOIKO15" viene literal del diseño; **probablemente sea un placeholder de otra marca (Goiko)** y haya que cambiarlo por el código real de La Casa Nostra.
  - Nav (La Carta, Trabaja, Iniciar Sesión, Reservar) sigue apuntando a anclas; esas páginas no existen todavía.
- **Logos**: integrados los SVG oficiales (rojo para fondos claros, crema para footer) vía componente `Logo` con prop `variant`.
- **Acción requerida**: Definir el flujo tras elegir recoger/domicilio y confirmar el código de descuento real.

### [2026-06-09] frontend-react — Home (landing) maquetada desde diseño
- **Qué cambió**: Implementada la primera pantalla (home) según el diseño aportado por el usuario. Componentes: `Header` (logo + nav + botones Hacer pedido/Reservar), `Footer` (contacto, horarios, páginas + wordmark gigante), `Logo`, `Marquee` (banda animada). Página `pages/Home.jsx` con secciones: Hero, Sobre nosotros, Nuestra carta (polaroids), banda marquee, El local, Trabaja con nosotros, cierre. CSS completo en `index.css` con tokens de marca. Responsive + `prefers-reduced-motion`. Build OK.
- **Por qué**: El usuario pidió construir esta pantalla a partir del diseño.
- **Nombre de marca**: confirmado **"La Casa Nostra"** (LCN). Corregido en `CLAUDE.md` e `index.html`.
- **Impacto / pendientes**:
  - **Imágenes reales pendientes**: hero, 3 fotos de carta, foto del local y caja de "trabaja". Ahora son placeholders grises (como en el propio diseño). Hace falta que el usuario los aporte.
  - **Logo**: provisional (texto + emoji barret). Sustituir por SVG/imagen de marca real.
  - Nav y botones apuntan a anclas `#...`; las páginas destino (carta, login, pedido, reservar, trabaja) aún no existen.
- **Acción requerida**: Usuario debe aportar imágenes y logo definitivos. Próximas pantallas a definir.

### [2026-06-09] frontend-react — Esqueleto mínimo del frontend
- **Qué cambió**: Scaffold base de React en `frontend/` (Vite + React 18). Solo `index.html`, `src/main.jsx`, `src/App.jsx` (placeholder) y `src/index.css`. Build verificado OK. SIN páginas, componentes, routing, auth, carrito ni mock data (se construirán cuando el usuario lo pida).
- **Por qué**: El usuario quiere el front limpio de momento. Un andamiaje previo más completo se retiró por ser prematuro.
- **Impacto para otros agentes**: Ninguno todavía.
- **Acción requerida**: Esperar instrucciones del usuario sobre qué pantalla construir primero.

### [2026-06-09] knowledge-coordinator — Protocolo de despacho añadido
- **Qué cambió**: `CLAUDE.md` ahora tiene la sección 0 (DISPATCHER): en cada prompt se analiza qué agente entra.
- **Impacto para otros agentes**: El hilo principal enruta; cada agente sigue trabajando en su dominio.
- **Acción requerida**: Ninguna.

### [2026-06-09] knowledge-coordinator — Decisiones de stack confirmadas
- **Qué cambió**: BD = PostgreSQL + Prisma · Pago = al repartidor (tarjeta/efectivo), sin pasarela online · Hosting = solo local.
- **Por qué**: Definidas por el usuario.
- **Impacto para otros agentes**:
  - `backend-node`: usar Prisma + PostgreSQL. El modelo de pedido lleva campo `paymentMethod` (CARD/CASH) y estado de pago "al recibir"; NO integrar Stripe ni cobros online.
  - `frontend-react`: en el checkout, selector de método de pago (tarjeta/efectivo al repartidor); sin formularios de tarjeta ni pago online.
  - `security-expert`: al no haber datos de tarjeta, el foco PCI desaparece; mantener foco en auth y datos personales (RGPD).
- **Acción requerida**: Tener en cuenta al andamiar back y checkout.

### [2026-06-09] knowledge-coordinator — Inicialización del proyecto
- **Qué cambió**: Creado el contexto (`CLAUDE.md`), los 6 agentes y este registro.
- **Por qué**: Arranque del proyecto LCN.
- **Impacto para otros agentes**: Leer `CLAUDE.md` antes de actuar.
- **Acción requerida**: Confirmar decisiones abiertas con el usuario.
