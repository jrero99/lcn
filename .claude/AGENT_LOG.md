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
