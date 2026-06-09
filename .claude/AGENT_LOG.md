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

### Contratos de API vigentes
_(vacío — aún no hay endpoints ni pantallas que los consuman)_

### Modelo de datos vigente
_(vacío — BD por definir)_

### Decisiones de arquitectura
- Stack: React (front) + Node/Express (back).
- **BD: PostgreSQL + Prisma (ORM).**
- **Pago: sin pasarela online.** Contra reembolso (tarjeta o efectivo al repartidor).
  El pedido guarda el método elegido; no hay cobro en la web.
- **Hosting: solo local** (desarrollo). Sin configuración de despliegue.

### Deuda / riesgos abiertos
- _(ninguno pendiente de decisión por ahora)_

---

## Bitácora

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
