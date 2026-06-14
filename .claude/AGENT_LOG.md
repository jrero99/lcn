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

### [2026-06-14] knowledge-coordinator — Plan anti-fraude incorporado a instrucciones de backend-node

- **Qué cambió**: El plan de seguridad anti-fraude/anti-abuso entregado por `security-expert` (entrada de 2026-06-14 más abajo) se ha consolidado como sección permanente "Requisitos de seguridad anti-fraude (NO negociables)" en `.claude/agents/backend-node.md`. El agente `backend-node` lo leerá automáticamente en cada sesión.
- **Por qué**: Petición explícita del usuario para que quede anotado de forma duradera antes de que se andamie el backend.
- **Impacto para otros agentes**: `frontend-react` debe retirar el campo `total` del body de `POST /api/orders` cuando se integre con la API real (solo enviar `{ productId, quantity }` por item). Pendiente de decisión del usuario: ¿el flujo de `PedidoDatos` incluirá el paso OTP antes de confirmar el pedido a domicilio?
- **Acción requerida**: Ninguna nueva. `backend-node` aplica estos requisitos cuando se andamie el backend.

### [2026-06-14] frontend-react — AuthContext mock + página /carta (solo lectura) + re-enrutado enlaces "La Carta"

- **Qué cambió**:

  **1. AuthContext mock (`frontend/src/context/AuthContext.jsx`, nuevo)**
  - Nuevo `AuthProvider` + hook `useAuth()`. Expone: `isAuthenticated` (bool), `user` (obj|null), `login(userData)`, `logout()`.
  - Persiste en `sessionStorage` (clave `lcn_auth`); inicializa leyendo de sessionStorage al montar.
  - Almacena solo datos no sensibles (email, nombre). NUNCA contraseñas ni JWTs.
  - Comentado extensamente como MOCK de UI; la auth real es responsabilidad del backend/security-expert.
  - `AuthProvider` montado en `main.jsx` dentro de `<BrowserRouter>`.

  **2. Login y Registro conectados al AuthContext**
  - `Login.jsx`: tras validación mock OK, llama a `login({ email })` antes de `navigate('/')`.
  - `Registro.jsx`: tras validación mock OK, llama a `login({ email, name: nombre })` antes de abrir el modal de bienvenida.
  - Validación existente y "NEVER log password" permanecen intactos.

  **3. Nueva página `/carta` (`frontend/src/pages/Carta.jsx`)**
  - Ruta `/carta` añadida en `App.jsx`.
  - Reutiliza `fetchCatalog()`, `CategoryNav`, `ProductCard`, `ProductModal`, `CheckoutBar`. Cero duplicación de lógica de carga.
  - `OrderCatalog` y el flujo `/hacer-pedido/...` no han sido modificados.
  - Estrategia: Carta reimplementa la vista con los mismos sub-componentes (no reutiliza `OrderCatalog` porque está acoplado al flujo de pedido).
  - Gating: ANÓNIMO = `ReadOnlyProductCard` (sin "+"), `ProductModal` con CTA login, banner fijo inferior. LOGUEADO = `ProductCard` interactivo, `CheckoutBar`, checkout a `/hacer-pedido/confirmar` con `mode: 'domicilio'` por defecto.
  - `ProductModal.jsx`: nuevo prop `readOnly` (bool, default `false`). Cuando `true`, el footer muestra `<Link to="/login">` en vez de "Añadir al pedido". Añadido `import { Link }` de react-router-dom.
  - CSS: clases `.carta-login-banner`, `.carta-login-banner-text`, `.carta-login-banner-btn` en `index.css`. Responsive: apilado vertical en ≤520px.

  **4. Re-enrutado de los tres puntos de entrada "La Carta"**
  - `Header.jsx`: `{ href: '/#carta' }` → `{ to: '/carta' }` (renderizado como `<Link>`).
  - `Home.jsx`: botón "Descubre nuestra carta completa" → `<Link to="/carta">` (antes `/hacer-pedido`).
  - `Footer.jsx`: `{ type: 'anchor', href: '/#carta' }` → `{ type: 'link', to: '/carta' }`.

- **Por qué**: Petición explícita del usuario.

- **TODOs / preguntas abiertas**:
  - ¿Debería todo el flujo de pedido (`/hacer-pedido/...`) requerir login? Solo `/carta` aplica gating ahora. Si se decide que sí, añadir un `ProtectedRoute` genérico. NO implementado ahora.
  - Mode selection en `/carta` logueado: checkout va con `mode: 'domicilio'` hardcodeado. Mejora futura marcada con TODO en `Carta.jsx`.
  - JWT real: cuando el backend implemente `POST /api/auth/login`, reemplazar `login({ email })` por llamada fetch real. JWT en httpOnly cookie (coordinar con security-expert).

- **Impacto para otros agentes**:
  - `backend-node`: puntos de integración en `Login.jsx` y `Registro.jsx` marcados con TODO.
  - `security-expert`: `sessionStorage` es temporal (XSS-vulnerable). Solución de producción: httpOnly cookie para JWT.
  - `testing-expert`: flujos: (1) `/carta` anónimo → banner visible, sin "+"; (2) `/carta` logueado → interactivo; (3) `ProductModal` anónimo → link login; (4) login mock → `isAuthenticated` true; (5) recarga → sessionStorage restaura estado; (6-8) los tres enlaces "La Carta" navegan a `/carta`.
  - `qa-expert`: verificar en 360px que el banner no oculta el último producto, CTA ≥44px.

- **Acción requerida**:
  - `backend-node` + `security-expert`: integrar auth real cuando exista el backend.
  - `testing-expert`: cubrir los flujos nuevos.
  - Decisión pendiente del usuario: ¿requiere login todo el flujo de pedido?

### [2026-06-14] security-expert — Plan anti-fraude/anti-abuso para pedidos con pago contra reembolso

- **Que cambio**: Entregado plan de seguridad por capas (no codigo) para proteger los endpoints de pedidos, reservas y auth frente a bots, pedidos falsos y abuso, adaptado al modelo de pago contra reembolso.
- **Por que**: Sin pasarela de pago online, el unico filtro anti-fraude son controles de servidor. Riesgo critico identificado antes de abrir el backend al publico.
- **Impacto para otros agentes**:
  - backend-node: POST /api/orders, POST /api/auth/register, POST /api/auth/login y POST /api/reservations DEBEN incorporar antes de despliegue: recalculo de total en servidor, rate limiting por IP+telefono, verificacion OTP en primer pedido a domicilio, idempotency key, lista negra, estado de pedido con confirmacion manual para clientes nuevos.
  - frontend-react: el body de POST /api/orders NO debe incluir el campo total calculado en cliente; solo ids y cantidades. El total autoritativo lo devuelve el servidor. Si el telefono no esta verificado, el flujo de PedidoDatos debe incluir el paso OTP.
- **Accion requerida**:
  - backend-node: Prioridad 1: recalculo total + rate limiting. Prioridad 2: verificacion OTP telefono. Prioridad 3: idempotency key + lista negra. Prioridad 4: geocoding direccion.
  - frontend-react: retirar campo total del body enviado a POST /api/orders.


### [2026-06-14] frontend-react — Capa de servicios: catalogService + consumo async en OrderCatalog

- **Qué cambió**:
  - Nueva carpeta `frontend/src/services/` y nuevo archivo `frontend/src/services/catalogService.js`.
    Exporta una función `async fetchCatalog()` que hoy resuelve el mock (`CATEGORIES`) como `Promise.resolve()`.
    Incluye el bloque TODO comentado con el fetch real (`fetch(\`${API_BASE_URL}/api/catalog\`)`),
    manejo de `res.ok` y lanzamiento de error. Define `API_BASE_URL` leída de
    `import.meta.env.VITE_API_URL` (Vite env var) con fallback a `''` (mismo origen).
    **Cuando exista el backend, solo hay que tocar este archivo.**
  - `frontend/src/pages/OrderCatalog.jsx` — refactorizado para consumo asíncrono:
    - Ya no importa `CATEGORIES` de `catalogMockData.js`.
    - Nuevos estados: `categories` (inicial `[]`), `loading` (inicial `true`), `error` (`null`).
    - `activeCategory` inicializado a `null`; se fija al primer elemento cuando llegan los datos.
    - `useEffect` al montar llama a `fetchCatalog()` con flag `cancelled` (protege setState tras desmontaje).
    - Renderiza estado de carga, error (con botón "Reintentar" que re-llama a `fetchCatalog()`)
      y vacío de forma sencilla (clases `.catalog-status-wrap`, `.catalog-status-msg`, etc.).
    - En el render principal, `CategoryNav` y las secciones consumen `categories` (array cargado),
      nunca el módulo de datos directamente.
    - Toda la lógica de carrito, modal, scroll a sección y checkout permanece intacta.
  - `frontend/src/index.css` — nuevas clases para los estados de carga/error/vacío del catálogo:
    `.catalog-status-wrap`, `.catalog-status-msg`, `.catalog-status-msg--error`,
    `.catalog-status-hint`, `.catalog-retry-btn`. Usan `var(--brand)`, `var(--muted)` — sin colores hardcodeados.
  - Build verificado: `npm run build` → 0 errores, 0 warnings.

- **Por qué**: Preparar el catálogo para cargarse dinámicamente desde la API cuando exista el backend,
  sin romper nada hoy. El punto de cambio queda reducido a un único archivo.

- **Impacto para otros agentes**:
  - `backend-node`: cuando implemente `GET /api/catalog`, el único archivo a actualizar en el front es
    `frontend/src/services/catalogService.js`. El bloque de fetch real ya está escrito y comentado,
    esperando ser descomentado. La respuesta debe ser un array de categorías con la forma documentada
    en `catalogMockData.js` (campos `id`, `label`, `heading`, `products[]`; cada producto con
    `id`, `name`, `description`, `price`, `allergens[]`, y `options[]` opcional).
    Poner `VITE_API_URL=http://localhost:3001` en `frontend/.env.local` para desarrollo local.
  - `testing-expert`: nuevos flujos a cubrir en `OrderCatalog`:
    (1) Estado loading → spinner/mensaje visible; (2) Error de red → mensaje de error + botón Reintentar;
    (3) Reintentar → vuelve a llamar a `fetchCatalog`; (4) Carga exitosa → categorías visibles;
    (5) Catálogo vacío → mensaje "La carta no está disponible".
    Para tests, hacer mock de `catalogService.fetchCatalog` (no del módulo mock de datos).
  - `qa-expert`: verificar en 360px que los estados de carga/error no producen overflow horizontal.
    Verificar que el botón "Reintentar" tiene target táctil ≥44px.

- **Acción requerida**:
  - `backend-node`: implementar `GET /api/catalog` con la forma documentada en `catalogMockData.js`.
    Cuando esté listo, descomentar el bloque `fetch` en `catalogService.js` y borrar el mock.
  - `testing-expert`: mockear `fetchCatalog` en tests de `OrderCatalog` para los nuevos estados async.

### [2026-06-10] frontend-react — Páginas Login y Registro + modal de bienvenida

- **Qué cambió**:
  - Nueva página `frontend/src/pages/Login.jsx` — ruta `/login`. Formulario con campos email (`type="email"`, `autocomplete="username"`) y contraseña (`type="password"`, `autocomplete="current-password"`). Estilo `.address-field` con icono SVG decorativo. Validación en cliente: formato email + contraseña no vacía. Mensajes `.field-error` con `role="alert"` y `aria-describedby`. Labels visualmente ocultos (`.sr-only`) para lectores de pantalla. Submit mock: previene default, valida, navega a `/` si ok. Nunca registra credenciales en consola. TODO marcado para `POST /api/auth/login`.
  - Nueva página `frontend/src/pages/Registro.jsx` — ruta `/registro`. Rejilla 2 columnas (→ 1 col en ≤520px) con 4 inputs: nombre (`autocomplete="given-name"`), apellidos (`autocomplete="family-name"`), email (`type="email"`, `autocomplete="email"`), teléfono (`type="tel"`, `inputMode="tel"`, `autocomplete="tel"`). 4 checkboxes en `<fieldset>`: 2 obligatorios (condiciones de venta + política de protección de datos) y 2 opcionales (mayoría de edad + comunicaciones comerciales). Validación en cliente: 4 campos + 2 checkboxes obligatorios con mensajes de error accesibles. Submit mock: abre el modal de bienvenida (`Modal.jsx` genérico reutilizado). Al cerrar el modal, navega a `/login` con `useNavigate`. TODO para `POST /api/auth/register`. Nunca registra datos personales en consola.
  - Modal de bienvenida: reutiliza `Modal.jsx` existente con `title="¡Bienvenido/a!"` y mensaje de éxito. Al cerrarlo navega a `/login`.
  - `frontend/src/App.jsx` — añadidas rutas `/login` → `<Login />` y `/registro` → `<Registro />` (junto con otras páginas legales añadidas en la misma sesión).
  - `frontend/src/components/Header.jsx` — "Iniciar Sesión" cambiado de `href: '#'` a `to: '/login'` (renderizado como `<Link>` gracias a la lógica ya existente de `link.to` vs `link.href`).
  - `frontend/src/index.css` — variable `--ink-green: #16261d` añadida en `:root`. Nuevas clases: `.auth-inner`, `.auth-form`, `.auth-fields-grid` (2 cols → 1 col ≤520px), `.auth-checkboxes`, `.check-hint-inline`, `.auth-divider`, `.auth-switch-text`, `.btn-block-dark` (botón oscuro secundario reutilizable, color vía `--ink-green`, min-height 52px). Responsive: ≤860px `font-size: 1rem` en inputs de auth (evita iOS zoom); ≤520px grid colapsa a 1 columna. Build verificado: 0 errores, 0 warnings.

- **Por qué**: Petición explícita del usuario. Las páginas de cuenta son la siguiente funcionalidad pendiente según `CLAUDE.md` sección 7.

- **Impacto para otros agentes**:
  - `backend-node`: endpoints necesarios para la integración real:
    - `POST /api/auth/login` — body: `{ email, password }`. Respuesta: token JWT + datos básicos del usuario.
    - `POST /api/auth/register` — body: `{ nombre, apellidos, email, telefono, aceptaCondiciones: true, aceptaPrivacidad: true, aceptaComunicaciones: boolean }`. Respuesta: confirmación de registro.
    - Puntos de integración marcados con `// TODO` en ambas páginas.
  - `security-expert`: revisar la integración real cuando se implemente el backend. Puntos clave: almacenamiento seguro del JWT (httpOnly cookie preferida sobre sessionStorage), CSRF, rate-limiting en login, que la contraseña nunca llegue a logs. La validación de cliente es solo UX; la real debe estar en el servidor.
  - `testing-expert`: flujos críticos: (1) Login submit vacío → 2 errores; (2) Login email inválido → error formato; (3) Login datos válidos → navega `/`; (4) Registro submit vacío → errores en 4 campos + 2 obligatorios; (5) Registro sin checkboxes obligatorios → error claro; (6) Registro válido → modal visible; (7) Cerrar modal → navega `/login`; (8) Link "Regístrate" → `/registro`; (9) Link "Identifícate" → `/login`.
  - `qa-expert`: verificar en 360px (1 columna en registro), targets táctiles ≥44px, botón oscuro distinguible del rojo, modal de bienvenida centrado y accesible.

- **Acción requerida**:
  - `backend-node`: definir e implementar `POST /api/auth/login` y `POST /api/auth/register`.
  - `security-expert`: revisar estrategia de almacenamiento JWT y controles de seguridad antes de la integración real.

### [2026-06-10] frontend-react — Página "Trabaja con nosotros" (/trabaja)

- **Qué cambió**:
  - `frontend/src/pages/Trabaja.jsx` (nuevo) — página de candidatura laboral. Hero centrado con título rojo (fuente heading, mayúsculas) y subtítulo en --muted. Formulario: fila 1 (Nombre + Teléfono, 2 cols → 1 en ≤860px), fila 2 (Email + botón "Adjuntar CV" que dispara un `<input type="file" accept=".pdf,.doc,.docx">` oculto y muestra el nombre del fichero), fila 3 (Mensaje, textarea opcional). Checkbox de consentimiento RGPD obligatorio (requisito legal + CLAUDE.md §5). Validación en cliente al submit: nombre, teléfono, email (formato), CV y RGPD obligatorios; mensaje opcional. Al enviar correctamente: abre el `Modal` genérico de confirmación y resetea el formulario. Sin llamada a API (mock). Marcado con `// TODO: POST /api/jobs` con el contrato esperado.
  - `frontend/src/App.jsx` — nueva ruta `/trabaja` → `<Trabaja />` + imports de `Login` y `Registro` añadidos por el linter (esas páginas ya existían).
  - `frontend/src/components/Header.jsx` — `NAV_LINKS` refactorizado: los items con `to` se renderizan como `<Link>` (React Router, sin recarga); los items con `href` siguen como `<a>`. "Trabaja con Nosotros" cambiado de `href: '/#trabaja'` a `to: '/trabaja'`. "Iniciar Sesión" actualizado por el linter a `to: '/login'` (la página existe). El hamburguesa y el cierre de nav al navegar siguen funcionando.
  - `frontend/src/pages/Home.jsx` — botón "Únete al equipo" cambiado de `<a href="#trabaja">` a `<Link to="/trabaja">`.
  - `frontend/src/components/Footer.jsx` — "Trabaja con Nosotros" cambiado de `type: 'anchor', href: '/#trabaja'` a `type: 'link', to: '/trabaja'`.
  - `frontend/src/index.css` — nuevas clases con prefijo `trabaja-` (~120 líneas): `.trabaja-page`, `.trabaja-hero`, `.trabaja-hero-title`, `.trabaja-hero-sub`, `.trabaja-form-wrap`, `.trabaja-form`, `.trabaja-row-two` (2 cols), `.trabaja-row-email` (email + btn CV), `.trabaja-field` (pill icon+input, 52px height), `.trabaja-field--textarea`, `.trabaja-file-input` (oculto off-screen), `.trabaja-cv-btn`, `.trabaja-cv-filename`, `.trabaja-rgpd-wrap/label/text/link`, `.trabaja-submit-btn`, `.trabaja-modal-thanks`. Clase utilitaria `.sr-only` añadida. Responsive en ≤860px: `.trabaja-row-two` y `.trabaja-row-email` colapsan a 1 columna; `.trabaja-cv-btn` ancho 100%; inputs font-size 1rem (evita zoom iOS). Build verificado: 0 errores, 0 warnings.

- **Por qué**: Petición del usuario — nueva página de formulario de candidatura laboral.

- **Impacto para otros agentes**:
  - `backend-node`: cuando se construya la API de empleo, el contrato esperado es `POST /api/jobs` con `Content-Type: multipart/form-data`, campos `nombre` (string), `telefono` (string), `email` (string), `mensaje` (string, opcional) y `cv` (File: pdf/doc/docx). Respuesta: `201 { message: string }`. Errores de validación: `422 { errors: { field: string }[] }`. El punto de integración está marcado con `// TODO: POST /api/jobs` en `Trabaja.jsx`.
  - `testing-expert`: flujos críticos a cubrir: (1) submit con todos los campos vacíos → 5 errores (nombre, teléfono, email, cvFile, rgpd); (2) email con formato inválido → error solo en email; (3) seleccionar archivo → muestra nombre del fichero; (4) submit válido → modal se abre, formulario se resetea; (5) cerrar modal (X / Escape / backdrop) → `isOpen` false; (6) responsive ≤860px: filas colapsan correctamente.
  - `qa-expert`: verificar en 360px sin overflow horizontal, targets táctiles ≥44px, inputs font-size 16px en móvil (sin zoom iOS), modal accesible (focus trap, aria).
  - `security-expert`: el formulario no logea datos personales en consola (cumplido). El campo RGPD es obligatorio antes del envío (cumplido). Cuando se conecte al backend, asegurarse de que el CV se valida en servidor (tipo MIME real, no solo extensión), y que el endpoint de jobs está autenticado o rate-limited para prevenir spam/abuso.

- **Acción requerida**:
  - `backend-node`: implementar `POST /api/jobs` (multipart/form-data) cuando se andamie el backend.
  - `security-expert`: revisar el flujo de subida de archivos cuando exista el endpoint backend.

### [2026-06-10] frontend-react — Animación de abanico en polaroids de la sección "Nuestra carta"

- **Qué cambió**:
  - `frontend/src/pages/Home.jsx` — añadidos imports `useRef` y `useEffect`. Nuevo ref `cartaPhotosRef` sobre `.carta-photos`. `useEffect` instancia un `IntersectionObserver` (threshold 0.35) que añade/quita la clase CSS `is-open` al contenedor cuando la sección entra/sale del viewport. El observer se limpia en el cleanup. No se usa estado React (la clase se gestiona directamente en el DOM como es habitual para efectos de scroll).
  - `frontend/src/index.css` — sección de polaroids ampliada:
    - Estado **recogido** (por defecto, sin `.is-open`): `transform: translateX(0) rotate(0deg) scale(0.85); opacity: 0.75;` con `transition: transform 0.6s cubic-bezier(0.34,1.1,0.64,1), opacity 0.5s ease`.
    - Estado **abierto** (`.carta-photos.is-open .polaroid-left/center/right`): cada polaroid recupera su inclinación característica (±8°) y se desplaza ligeramente hacia fuera (±12px translateX). Delays escalonados: 0 / 0.08s / 0.16s para efecto abanico.
    - Overrides responsive actualizados: en ≤860px y ≤520px las reglas pasan a usar `.carta-photos.is-open` con las rotaciones propias de cada breakpoint (±5° y ±4° respectivamente), eliminando los conflictos con el estado recogido.
    - `@media (prefers-reduced-motion: reduce)` desactiva las transiciones y muestra las polaroids directamente en su estado natural (sin animación).
  - Build `vite build` verificado: 0 errores, 0 warnings.

- **Por qué**: Petición del usuario para animar la sección carta al hacer scroll.

- **Impacto para otros agentes**:
  - `testing-expert`: si hay tests de snapshot del componente `Home`, actualizar. Considerar test de que `IntersectionObserver` añade/quita la clase `is-open` correctamente.
  - `qa-expert`: verificar en 360px que el estado recogido no causa overflow horizontal. Verificar en `prefers-reduced-motion: reduce` que las fotos se ven abiertas desde el inicio.

- **Acción requerida**: Ninguna urgente.

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
