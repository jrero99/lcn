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
- [ALTO] JWT access token configurado a 7 días en `backend/src/utils/jwt.js:22` (maxAge cookie) pero `JWT_EXPIRES_IN` en .env.example dice "15m". El token real firmado por signToken usa `config.jwtExpiresIn` (default "7d"). Alargar la expiración en caso de robo de cookie extiende mucho la ventana de ataque. Requiere alinear duración real del JWT con la del cookie o implementar refresh tokens.
- [ALTO] Rate limiting solo por IP (`express-rate-limit` default). No hay rate limiting por teléfono/cuenta en `POST /api/orders` ni en `POST /api/auth/login` a nivel de middleware (el bloqueo por cuenta en login está en memoria en-proceso: se reinicia al reiniciar el servidor y no escala a multi-instancia).
- [MEDIO] CORS: un OPTIONS preflight a un origen no permitido devuelve 204 sin cabeceras CORS, pero no rechaza activamente la conexión — aceptable, pero el comportamiento es silencioso. Ningún bloqueante.
- [MEDIO] `backend/src/controllers/adminController.js:updateOrderStatus` — no valida que la transición de estado sea legal (p.ej. pasar de DELIVERED a PENDING). Cualquier admin puede fijar cualquier estado arbitrario. Riesgo de corrupción de historial.
- [MEDIO] `selectedOptions` en `orderService.js` — los choiceIds enviados por el cliente se usan para consultar `optionChoice` en BD, pero no se verifica que esos choices pertenezcan al producto del item. Un cliente podría referenciar opciones de otro producto (aunque el total se recalcula correctamente, los datos de la línea quedarían inconsistentes).
- [BAJO] `backend/src/services/authService.js:loginFailures` — Map en memoria. En reinicios del proceso o deploy multi-instancia el contador se resetea, anulando la protección de bloqueo temporal.
- [BAJO] `backend/src/controllers/adminController.js:listOrders` — el parámetro `?status=` no se valida contra el enum `OrderStatus` antes de pasarlo al where de Prisma. Un valor inválido no rompe la consulta (Prisma lo ignoraría o lanzaría error) pero es superficie de entrada sin sanear.
- [BAJO] Dependencia transitiva vulnerable: `argon2@0.31.2` tira de `@mapbox/node-pre-gyp@1.0.11` que incluye `tar<=7.5.10` (CVE path traversal, severity HIGH). Es una dependencia de build/instalación, no de runtime, pero conviene resolverla con `npm audit fix` cuando haya versión compatible de argon2.

- [MEDIO] Google SSO — vinculación automática de cuenta admin por email: si el admin (`lacasanostramataro@gmail.com`) hace login con Google y su email coincide, se vincula `googleId` sin promoción de rol (correcto), pero a partir de ese momento puede autenticarse sin contraseña. El rol se lee de BD en `requireAuth` (no del token), así que no hay escalada de privilegios. El riesgo real es que un atacante que controle una cuenta Google con el mismo email obtenga acceso admin vía SSO. Mitigación recomendada: registrar explícitamente en el log de auditoría cada vinculación de googleId en una cuenta existente (`backend/src/services/authService.js:224`), y considerar requerir re-autenticación por contraseña antes de vincular SSO en cuentas con `role=ADMIN`.
- [MEDIO] Google SSO — `jwt.js:22` `maxAge` de cookie sigue a 7 días independientemente del `JWT_EXPIRES_IN`. Este riesgo existía antes del SSO pero se agrava porque ahora hay más superficie de autenticación. Pendiente de la deuda [ALTO] ya registrada sobre JWT lifetime.
- [BAJO] Google SSO — `googleAuthLimiter` (10 req/IP/15 min) es más permisivo que `loginLimiter` (5 req/IP/15 min). Dado que ambos endpoints producen la misma cookie JWT, el endpoint SSO podría usarse para eludir el rate-limit más estricto del login por contraseña. Recomendación: igualar a 5 req/IP/15 min (`backend/src/middleware/rateLimiter.js:44`).
- [BAJO] Google SSO — RGPD: usuarios creados por SSO reciben `acceptedTerms: true` y `acceptedPrivacy: true` automáticamente (`backend/src/services/authService.js:247`). Esto se documenta como deuda post-MVP, pero implica que no hay consentimiento explícito registrado para estos usuarios. Bloqueante legal antes de producción.
- [BAJO] Google SSO — `dummyHash` en `login()` no es un hash argon2id válido. Si `argon2.verify` recibe ese string malformado lanzará una excepción en lugar de devolver `false`, lo que podría producir un 500 en lugar del 401 esperado. El flujo correcto se mantiene gracias al `if (!user.passwordHash)` posterior, pero la rama de timing-safe falla antes. Corrección: usar un hash pre-calculado real o capturar el error de `argon2.verify` (`backend/src/services/authService.js:98-102`).
- [RESUELTO 2026-06-16] Addresses — PATCH con city sin postalCode (o viceversa): el refinement de zona en `updateAddressSchema` ha sido movido a `addressService.updateAddress()`, donde la fila existente ya está cargada. Se calculan los valores efectivos (`incoming ?? existing`) antes de validar la zona. Casos como PATCH `{ city: "Barcelona" }` sobre fila con `postalCode: "28001"` ahora devuelven 422. Ver bitácora 2026-06-16 backend-node (fix M-1).
- [BAJO] Addresses — `addressMutationLimiter` es por IP (20 req/hora). Si el servicio se despliega detrás de un proxy/balanceador sin `app.set('trust proxy', 1)`, todos los clientes compartirán la IP del proxy y el limiter se agotará colectivamente. Verificar que `trust proxy` está configurado cuando se despliegue el backend. (`backend/src/middleware/rateLimiter.js:64`, `backend/src/index.js`)
- [BAJO] Addresses RGPD — el borrado de cuenta (`deleteAccount`) hace soft-delete de direcciones pero `Order.deliveryAddress` (snapshot de texto con calle, número, ciudad) permanece sin anonimizar. Para un borrado RGPD completo post-MVP habría que nullificar también ese campo. Documentado como pendiente en el AGENT_LOG (2026-06-16 backend-node), pero conviene registrarlo aquí también como riesgo abierto. (`backend/src/services/authService.js:277-297`)
---

## Bitácora

### [2026-06-16] backend-node — Fix M-1: validación de zona de reparto en PATCH parcial de direcciones

- **Qué cambió**:
  - `backend/src/validators/addresses.js`: eliminado el `superRefine` de zona de reparto de `updateAddressSchema`. El Zod schema para PATCH ya no intenta validar la combinación `city+postalCode` porque no tiene acceso a los valores actuales en BD. Se conserva el refinement de "body vacío" y todos los validadores de formato por campo (`postalCodeField` sigue exigiendo 5 dígitos, `cityField` sigue exigiendo longitud 2-100, etc.). Añadido comentario explícito indicando dónde vive ahora la comprobación.
  - `backend/src/services/addressService.js`: añadida función helper privada `isInDeliveryZone(city, postalCode)` que replica la regla (misma lógica que `refineDeliveryZone` en el validator). En `updateAddress()`, la query de lectura de la fila existente ahora también selecciona `city` y `postalCode`. Tras el ownership check, si el PATCH toca `city` y/o `postalCode`, se calculan los valores efectivos (`data.X ?? existing.X`) y se llama a `isInDeliveryZone`; si falla, lanza `httpError(422, 'Delivery is only available in Mataró (postal codes 08301–08304)')`, mismo mensaje y código que el POST.

- **Por qué**: hallazgo de seguridad M-1. El refinement anterior evaluaba la zona usando solo los campos del body, rellenando el ausente con cadena vacía. Esto permitía que un PATCH con `{ postalCode: "08301" }` pasara aunque la fila tuviera `city: "Reus"` (combinación incoherente), o que `{ city: "Mataró" }` pasara dejando `postalCode: "28001"` en BD.

- **Casos cubiertos por el fix**:
  1. `PATCH { city: "Barcelona" }` con fila existente `postalCode: "08301"` → efectivo `(Barcelona, 08301)` → validCity=false, validPostal=true → **pasa** (CP válido compensa). Comportamiento correcto.
  2. `PATCH { city: "Mataró" }` con fila existente `postalCode: "28001"` → efectivo `(Mataró, 28001)` → validCity=true → **pasa**. Correcto.
  3. `PATCH { postalCode: "08301" }` con fila existente `city: "Reus"` → efectivo `(Reus, 08301)` → validPostal=true → **pasa**. Correcto (el CP es el campo autoritativo para la zona).
  4. `PATCH { city: "Barcelona" }` con fila existente `postalCode: "28001"` → efectivo `(Barcelona, 28001)` → validCity=false, validPostal=false → **422**. Era el bug; ahora se rechaza.
  5. `PATCH { postalCode: "28001" }` con fila existente `city: "Reus"` → efectivo `(Reus, 28001)` → **422**. Bug simétrico; también corregido.

- **Impacto para otros agentes**:
  - `testing-expert`: añadir casos de integración para PATCH parcial: (a) PATCH `{ city: "Barcelona" }` sobre dirección con `postalCode: "28001"` → 422; (b) PATCH `{ postalCode: "28001" }` sobre dirección con `city: "Reus"` → 422; (c) PATCH `{ postalCode: "08302" }` sobre dirección con `city: "Reus"` → 200 (CP válido compensa); (d) PATCH `{ city: "Mataró" }` sobre dirección con `postalCode: "28001"` → 200 (city válida compensa).
  - `frontend-react`: sin cambio de contrato. El endpoint sigue respondiendo 422 con `{ error: "Delivery is only available in Mataró (postal codes 08301–08304)" }` en caso de zona inválida. El `AddressManager` ya maneja este 422.

- **Acción requerida**: `testing-expert` cubrir los 4 casos de test indicados arriba.

### [2026-06-16] security-expert -- Auditoria feature gestion de direcciones (RGPD + IDOR)

- **Que cambio**: Auditoria de la feature de gestion de direcciones de usuario antes del merge a main.
- **Por que**: Dato personal (RGPD). Riesgo de IDOR/BOLA (acceso a recursos de otros usuarios). Foco en los 7 puntos solicitados.
- **Resultado**: Sin hallazgos CRITICOS ni ALTOS nuevos en esta feature. Ownership check correcto. Un hallazgo MEDIO (validacion de zona en PATCH parcial) y dos hallazgos BAJO documentados en 'Deuda / riesgos abiertos'.
- **Impacto para otros agentes**: Ninguna accion bloqueante. El hallazgo MEDIO de validators/addresses.js debe resolverse antes de produccion.
- **Accion requerida**: backend-node corregir la logica de refineDeliveryZone en updateAddressSchema cuando solo se actualiza uno de los dos campos de zona (city o postalCode sin el otro).

### [2026-06-16] frontend-react — Gestión de direcciones + login obligatorio en flujo de pedido

- **Qué cambió**:

  **Ficheros nuevos:**
  - `frontend/src/services/addressService.js` — capa de servicios con las 4 operaciones CRUD sobre `/api/addresses` (`getAddresses`, `createAddress`, `updateAddress`, `deleteAddress`) + helper `formatAddress(addr)`. Todas las llamadas usan `credentials: 'include'`. Errores en castellano por código HTTP.
  - `frontend/src/components/AddressManager.jsx` — componente reutilizable de gestión de direcciones. Estados: `list` (selector con radio + editar/borrar), `add` (POST /api/addresses), `edit` (PATCH /api/addresses/:id). Modal de confirmación de borrado reutiliza `Modal` genérico. Props: `selectedId`, `onSelect(id)`, `onSelectAddress(addr)`, `showHeading`. Disponible para uso futuro en página de cuenta de usuario.

  **Ficheros modificados:**
  - `frontend/src/pages/PedidoDatos.jsx` — reescritura: modo `recoger` no pide dirección; modo `domicilio` requiere sesión (redirect a `/login` si no hay sesión), monta `<AddressManager>`, botón "Continuar" deshabilitado hasta que haya `selectedAddressId`. Botón "Usar mi ubicación" (geolocalización) **eliminado** definitivamente. Propaga `{ addressId, addressLabel, timing, age }` en lugar de `{ address, timing, age }`.
  - `frontend/src/pages/OrderCatalog.jsx` — lee `addressId` y `addressLabel` de `useLocation().state`; los pasa a `<CheckoutBar>` y los propaga al navegar a confirmación. Guarda de recarga: si `mode=domicilio` y `addressId===null` (navState perdido) → redirect a `/hacer-pedido/datos?mode=domicilio`.
  - `frontend/src/pages/OrderConfirmation.jsx` — añadida guarda de sesión: redirect a `/login` si no autenticado. Lee `addressId` del state (listo para `POST /api/orders`).
  - `frontend/src/components/CheckoutBar.jsx` — nueva prop `addressLabel` (string|null). Muestra la dirección real del usuario; si null → "Sin dirección seleccionada". Elimina el placeholder hardcodeado anterior.
  - `frontend/src/index.css` — nuevas clases para `AddressManager` y sub-componentes: `.addr-manager`, `.addr-list`, `.addr-item`, `.addr-item--selected`, `.addr-item-radio-*`, `.addr-form-*`, `.addr-add-btn`, `.addr-modal-actions`, `.btn--danger`. `.btn-continue:disabled` añadido. Responsive ≤520px.

- **Cambio de contrato de navegación (state) en el flujo de pedido**:
  ```diff
  - navigate('/hacer-pedido/{mode}', { state: { address: string, timing, age } })
  + navigate('/hacer-pedido/{mode}', { state: { addressId: string|null, addressLabel: string|null, timing, age } })
  - navigate('/hacer-pedido/confirmar', { state: { mode, items, total } })
  + navigate('/hacer-pedido/confirmar', { state: { mode, items, total, addressId, addressLabel } })
  ```

- **Login obligatorio para pedir**: `PedidoDatos` (modo domicilio) y `OrderConfirmation` comprueban `useAuth().isAuthenticated`. Si no hay sesión → redirect a `/login` con `state.from`. El modo recoger en PedidoDatos NO requiere sesión.

- **Componente `AddressManager` listo para cuenta de usuario**: usar sin props para gestión standalone. Con `selectedId` + `onSelect` + `onSelectAddress` para el flujo de pedido.

- **Verificación**: `npm run build` → 84 módulos, 0 errores, 0 warnings.

- **Impacto para otros agentes**:
  - `testing-expert`: (1) domicilio sin sesión → redirect `/login`; (2) domicilio con sesión sin direcciones → formulario de alta; (3) domicilio con sesión y direcciones → selector radio, Continuar habilitado tras seleccionar; (4) dirección fuera de Mataró → error 422 mostrado; (5) editar/borrar direcciones; (6) límite 10 → botón "Añadir" oculto; (7) recoger → no aparece campo de dirección.
  - `qa-expert`: verificar UX del selector en móvil (radio dot, touch target 44px), que el botón "Continuar" sea visualmente gris/deshabilitado sin dirección, que el texto del checkout bar muestre la dirección real.
  - `backend-node`: ninguna acción requerida.

- **Acción requerida**: cuando se implemente `POST /api/orders` en el frontend, incluir `addressId` en el body si `mode === 'domicilio'` (ya disponible en `OrderConfirmation.state.addressId`).

### [2026-06-16] frontend-react — Bug fix: dirección real del usuario en la barra de checkout (domicilio)

- **Qué cambió**:

  **`frontend/src/pages/OrderCatalog.jsx`**:
  - Añadida prop `addressLabel={addressLabel}` a `<CheckoutBar>`. Era la prop faltante: `addressLabel` se leía de `navState` (línea 87) pero no se pasaba hacia abajo.
  - Importado `Navigate` de `react-router-dom`.
  - Añadida guarda de recarga de página: si `mode === 'domicilio'` y `addressId` es `null` (navState perdido en recarga dura), se renderiza `<Navigate to="/hacer-pedido/datos?mode=domicilio" replace />` antes de cualquier otro render. Esto evita que el usuario vea el catálogo con una dirección vacía o inválida.

  **`frontend/src/pages/PedidoDatos.jsx`** — sin cambios. Ya tenía la lógica correcta:
  - `selectedAddressLabel` se declara y se setea via `onSelectAddress` prop del `AddressManager`.
  - El label se construye como `(addr.label ? addr.label + ' — ' : '') + formatAddress(addr)`.
  - Se propaga en `navigate` como `addressLabel`.

  **`frontend/src/components/AddressManager.jsx`** — sin cambios. Ya invoca `onSelectAddress(addr)` con el objeto completo en todos los puntos de selección (radio change, click en contenido, auto-select tras crear dirección nueva).

  **`frontend/src/components/CheckoutBar.jsx`** — sin cambios. Ya tenía prop `addressLabel` declarada y la usaba en modo domicilio: `{addressLabel ?? 'Sin dirección seleccionada'}`. No había texto hardcodeado de ninguna calle.

- **Por qué**: la prop `addressLabel` nunca llegaba a `CheckoutBar` porque `OrderCatalog` no la incluía en el JSX. La barra mostraba el fallback `null ?? 'Sin dirección seleccionada'`.

- **Flujo corregido**:
  1. `AddressManager` → `onSelectAddress(addr)` con objeto completo.
  2. `PedidoDatos` → `setSelectedAddressLabel(formatAddress(addr))` y luego `navigate('/hacer-pedido/domicilio', { state: { addressId, addressLabel } })`.
  3. `OrderCatalog` → lee `navState.addressLabel`, lo pasa como `addressLabel={addressLabel}` a `<CheckoutBar>`.
  4. `CheckoutBar` → renderiza el string formateado en modo domicilio.

- **Caso de recarga de página**: `navState` se pierde en una recarga dura del navegador. Si `mode === 'domicilio'` y `addressId === null`, `OrderCatalog` redirige a `/hacer-pedido/datos?mode=domicilio` con `replace`. El usuario selecciona de nuevo su dirección y continúa.

- **Verificación**: `npm run build` → 84 módulos, 0 errores, 0 warnings.

- **Acción requerida**: ninguna.

### [2026-06-16] frontend-react — Carrito con personalizaciones por línea + panel expandible + recibo detallado

- **Qué cambió**:

  **`frontend/src/pages/OrderCatalog.jsx`** (refactor del carrito):
  - Estructura del carrito cambiada de `{ [productId]: { product, quantity } }` a `{ [lineKey]: { key, product, quantity, selectedOptions, removedIngredients, notes } }`. Una clave combina `productId + JSON({ opciones ordenadas, ingredientes removidos ordenados, notas })`. Mismo producto con distintas personalizaciones = líneas separadas; misma personalización = incrementa quantity.
  - `handleAddToCart` ya respeta la personalización recibida del `ProductModal`. El "+" de `ProductCard` pasa objeto vacío → su propia clave "sin personalizar".
  - Nuevos helpers: `buildCartKey`, `computeUnitPrice` (suma `priceExtra` de los choices), `resolveOptionLabels` (convierte `selectedOptions` a `[{ groupLabel, choiceLabel }]`).
  - `handleChangeLineQuantity(key, delta)` y `handleRemoveLine(key)` — nuevas callbacks que se pasan a `CheckoutBar`.
  - `handleCheckout` construye items con forma enriquecida: `{ key, id, name, unitPrice, quantity, lineTotal, options[], removedIngredients[], notes }`.
  - Props nuevas pasadas a `CheckoutBar`: `cartCount`, `cartLines`, `onChangeLineQuantity`, `onRemoveLine`.

  **`frontend/src/components/CheckoutBar.jsx`** (panel expandible):
  - Envuelto en `.checkout-bar-container` (el fijo) que contiene encima `.checkout-cart-panel` (deslizable).
  - El botón "Ver pedido (N)" / "Ocultar" alterna `expanded`. Muestra contador de unidades.
  - Panel lista todas las líneas: controles +/−, nombre, precio de línea, icono eliminar. Bajo cada línea, las personalizaciones (opciones, Sin:, Nota:) solo si existen.
  - `aria-expanded`, `aria-controls`, `aria-label` dinámicos. Todos los botones ≥44px de tap target. Panel con `overscroll-behavior: contain` y `max-height: 55vh`.

  **`frontend/src/pages/OrderConfirmation.jsx`** (recibo con personalizaciones):
  - Cada `<li>` es ahora un `.confirm-list-item` con dos partes: fila `cantidad×nombre + precio` y (si existe) lista `.confirm-item-custom` con las personalizaciones (opciones, Sin:, Nota:).
  - Compatible con el shape nuevo (`unitPrice/lineTotal/options`) y con el shape legado (`price`) mediante fallbacks.
  - `key` único de línea: usa `it.key` del carrito (nunca duplicado aunque haya dos líneas del mismo producto).

  **`frontend/src/index.css`**:
  - `.checkout-bar` ya no tiene `position: fixed` propio (lo hereda del contenedor `.checkout-bar-container`).
  - Clases nuevas: `.checkout-bar-container`, `.checkout-cart-panel`, `.checkout-cart-panel-inner`, `.checkout-cart-lines`, `.checkout-cart-line`, `.checkout-cart-line-main`, `.checkout-cart-line-qty`, `.checkout-cart-qty-btn`, `.checkout-cart-qty-num`, `.checkout-cart-line-name`, `.checkout-cart-line-total`, `.checkout-cart-remove-btn`, `.checkout-cart-custom`, `.checkout-cart-custom-item`, `.checkout-cart-custom-label`, `.checkout-bar-view-btn`.
  - Clases de confirmación actualizadas: `.confirm-list-item`, `.confirm-list-item-row`, `.confirm-item-label`, `.confirm-item-price`, `.confirm-item-custom`, `.confirm-item-custom-row`, `.confirm-item-custom-label`. El `li` directo `.confirm-total` sigue funcionando.
  - Responsive: overrides en ≤860px (panel indentación) y ≤520px (panel altura, indentación reducida, view-btn tap target).

- **Por qué**: las personalizaciones (acompañante, salsa, ingredientes quitados, nota libre) se perdían al añadir al carrito. Requisito del usuario.

- **Decisiones de UX tomadas**:
  - El panel de carrito se abre encima de la barra fija (no modal separado) para que el usuario pueda seguir viendo la carta al cerrarlo.
  - El botón "Ver pedido" con contador de unidades es más informativo que un contador solo.
  - Se evitó el `Modal` genérico para el panel de carrito porque la hoja deslizante da mejor UX en móvil para una lista de items (el `Modal` genérico está centrado y es para confirmaciones de una sola acción).
  - Las personalizaciones se muestran con tamaño reducido y color atenuado (`var(--muted)`) para no competir visualmente con el nombre del producto.

- **Impacto para otros agentes**:
  - `backend-node`: cuando se conecte `POST /api/orders`, el body de cada item ya viene con `selectedOptions`, `removedIngredients` y `notes` (campos preparados en `handleCheckout`). No requiere cambios en el contrato ya documentado.
  - `testing-expert`: nuevos flujos a cubrir: (1) dos bocadillos iguales con distintas salsas → dos líneas en panel; (2) mismo producto misma personalización → una línea con quantity 2; (3) +/− en panel actualiza total; (4) eliminar línea; (5) recibo muestra personalizaciones por línea.

- **Verificación**: `npm run build` → 82 módulos, 0 errores, 0 warnings.

- **Acción requerida**: ninguna inmediata.

### [2026-06-16] backend-node — Modelo Address + CRUD /api/addresses + cambio de contrato POST /api/orders

- **Qué cambió**:

  **Schema Prisma (`backend/prisma/schema.prisma`)**:
  - Nuevo modelo `Address` (tabla `addresses`): `id UUID PK`, `userId FK`, `label?`, `street`, `number`, `floorDoor?`, `postalCode CHAR(5)`, `city`, `notes?`, `deletedAt?` (soft-delete), `createdAt`, `updatedAt`. Índices en `(userId)` y `(userId, deletedAt)`.
  - Soft-delete justificado: las `Order` guardan FK blando `addressId → addresses.id`. Borrar físicamente una dirección rompería la integridad referencial de pedidos históricos. El soft-delete mantiene la fila (y la FK) mientras el usuario ya no la ve.
  - Modelo `Order` ampliado: nuevo campo `addressId UUID? @map("address_id")` con FK a `Address` (`ON DELETE SET NULL`). El campo `deliveryAddress String?` sigue siendo el snapshot inmutable (texto libre). Índice añadido en `orders.address_id`.
  - Relación inversa en `User`: `addresses Address[]`.

  **Migración SQL** (`backend/prisma/migrations/20260616100000_add_addresses/migration.sql`):
  - `CREATE TABLE "addresses"` con todas las columnas.
  - FK `addresses.user_id → users.id` con `ON DELETE RESTRICT`.
  - `ALTER TABLE "orders" ADD COLUMN "address_id" UUID`.
  - FK `orders.address_id → addresses.id` con `ON DELETE SET NULL`.
  - Índices correspondientes.

  **Ficheros nuevos**:
  - `backend/src/validators/addresses.js` — schemas Zod `createAddressSchema` y `updateAddressSchema`. Validación de zona de reparto (Mataró / CP 08301–08304) en el servidor. Rechaza PATCH vacío.
  - `backend/src/services/addressService.js` — `listAddresses`, `createAddress` (cap 10 por usuario), `updateAddress`, `softDeleteAddress`, `softDeleteAllUserAddresses` (RGPD), `resolveAddressForOrder` (para orderService), `buildAddressSnapshot` (genera la cadena de texto del snapshot).
  - `backend/src/controllers/addressController.js` — handlers `getAddresses`, `addAddress`, `editAddress`, `deleteAddress`.
  - `backend/src/routes/addresses.js` — rutas `/api/addresses` con `requireAuth` + `addressMutationLimiter` en mutaciones.

  **Ficheros modificados**:
  - `backend/src/middleware/rateLimiter.js` — añadido `addressMutationLimiter` (20 req/IP/hora para POST/PATCH/DELETE de addresses).
  - `backend/src/index.js` — importado e instalado `addressesRoutes` en `/api/addresses`.
  - `backend/src/validators/orders.js` — **BREAKING CHANGE**: campo `address` (objeto inline) eliminado; sustituido por `addressId` (UUID). Para `mode=DELIVERY`, el body ahora DEBE incluir `addressId` que pertenezca al usuario autenticado. Instrucción al cliente: crear la dirección primero via `POST /api/addresses`.
  - `backend/src/services/orderService.js` — usa `resolveAddressForOrder(userId, addressId)` + `buildAddressSnapshot()` en lugar de construir `addressStr` desde el body. Guarda `addressId` en `Order.addressId`. El snapshot sigue en `Order.deliveryAddress`.
  - `backend/src/services/authService.js` — `deleteAccount()` llama a `softDeleteAllUserAddresses(userId)` antes de anonimizar el usuario (RGPD: las direcciones son dato personal).

- **Por qué**: el usuario quiere que los clientes puedan guardar múltiples direcciones en su cuenta y seleccionarlas al hacer un pedido a domicilio. El flujo anterior aceptaba una dirección libre en el body del pedido; ahora el pedido referencia una dirección previamente creada y verificada.

- **Contrato de API — `/api/addresses`** (todos requieren cookie JWT / `credentials: 'include'`):

  ```
  GET /api/addresses
  → 200 { addresses: Address[] }
  → 401 si no autenticado

  POST /api/addresses
  Body: {
    label?:     string (max 50)       — "Casa", "Trabajo"
    street:     string (3–200)        — "Carrer de Barcelona"
    number:     string (1–10)         — "12", "12B"
    floorDoor?: string (max 50)       — "3r 2a", "Bajos"
    postalCode: string (5 dígitos)    — "08302"
    city:       string (2–100)        — "Mataró"
    notes?:     string (max 300)      — "Portero 2B"
  }
  → 201 { address: Address }
  → 401 si no autenticado
  → 422 Zod o zona fuera de Mataró/08301-08304
  → 422 si el usuario ya tiene 10 direcciones activas
  → 429 rate limit

  PATCH /api/addresses/:id
  Body: cualquier subconjunto de los campos de POST (al menos uno)
  → 200 { address: Address }
  → 401 si no autenticado
  → 404 si la dirección no existe, está borrada, o es de otro usuario
  → 422 Zod o zona fuera de Mataró/08301-08304
  → 429 rate limit

  DELETE /api/addresses/:id
  → 204 (sin body)
  → 401 si no autenticado
  → 404 si la dirección no existe, está borrada, o es de otro usuario
  → 429 rate limit
  ```

  Forma de `Address` en la respuesta:
  ```json
  {
    "id": "uuid",
    "label": "Casa",
    "street": "Carrer de Barcelona",
    "number": "12",
    "floorDoor": "3r 2a",
    "postalCode": "08302",
    "city": "Mataró",
    "notes": "Portero 2B",
    "createdAt": "2026-06-16T10:00:00.000Z"
  }
  ```

- **Cambio de contrato — `POST /api/orders`** (BREAKING para el frontend):

  ```diff
  - Body: { ..., address: { street, city, postalCode, ... } }
  + Body: { ..., addressId: "uuid" }   (solo para mode=DELIVERY)
  ```

  Reglas:
  - `mode=DELIVERY` → `addressId` OBLIGATORIO (UUID que pertenezca al usuario). 400 si ausente o inválido.
  - `mode=PICKUP` → `addressId` IGNORADO / no necesario.
  - El servidor llama a `resolveAddressForOrder(userId, addressId)` para verificar ownership.
  - Copia el snapshot (`buildAddressSnapshot`) a `Order.deliveryAddress`.
  - Guarda el FK blando en `Order.addressId`.

  Flujo de UI recomendado para el frontend:
  1. Antes de llegar al paso de confirmación del pedido a domicilio, verificar que el usuario tiene al menos una dirección (`GET /api/addresses`).
  2. Si no tiene ninguna, mostrar el formulario de "Añadir dirección" (`POST /api/addresses`).
  3. Si tiene varias, mostrar selector. El UUID elegido se envía como `addressId` en `POST /api/orders`.
  4. No rellenar nada de forma automática (sin geolocalización). Si no hay dirección guardada → no se puede confirmar.

- **RGPD — direcciones como dato personal**:
  - `DELETE /api/users/me` (borrado de cuenta) llama a `softDeleteAllUserAddresses(userId)` antes de anonimizar el usuario. Las filas de `addresses` reciben `deletedAt = now()`.
  - Los pedidos históricos retienen su `deliveryAddress` (snapshot de texto) y `addressId` FK. Esto es necesario para la trazabilidad del pedido (el admin necesita saber a dónde se entregó).
  - En un borrado RGPD completo (post-MVP), se podrían nullificar también los snapshots de texto, pero eso requiere decisión explícita y escapa al MVP.

- **Verificación**: `node --check` OK en todos los ficheros tocados (9 archivos).

- **Impacto para otros agentes**:
  - `frontend-react`: **ACCIÓN REQUERIDA**. El flujo de pedido a domicilio debe cambiar:
    1. Añadir pantalla/modal de gestión de direcciones (listar, crear, seleccionar).
    2. Enviar `addressId` en lugar del objeto `address` en `POST /api/orders`.
    3. Gestionar el caso "sin direcciones" con UI clara.
    Ver contrato completo arriba.
  - `testing-expert`: tests de integración recomendados: (1) `POST /api/addresses` con CP fuera de zona → 422; (2) ownership check: usuario A no puede editar/borrar dirección de usuario B → 404; (3) 11ª dirección → 422; (4) `POST /api/orders DELIVERY` sin `addressId` → 422; (5) `POST /api/orders DELIVERY` con `addressId` de otro usuario → 400; (6) `DELETE /api/users/me` → todas las direcciones quedan con `deletedAt` no nulo.
  - `security-expert`: revisar que el ownership check en `updateAddress` y `softDeleteAddress` devuelve 404 (no 403) para no filtrar existencia de direcciones de otros usuarios — ya implementado así.

- **Acción requerida**:
  - `frontend-react`: adaptar flujo de pedido a domicilio (ver arriba).
  - `testing-expert`: cubrir los casos indicados.
  - Ejecutar la migración en la BD: `npx prisma migrate deploy` (o `migrate dev --name add_addresses` si se prefiere regenerar).

### [2026-06-16] backend-node — `POST /api/reservations` reimplementado con validación de horario de apertura

- **Qué cambió**:

  **Ficheros nuevos:**
  - `backend/src/config/openingHours.js` — fuente única de los horarios de apertura. Exporta la constante `OPENING_HOURS` (array de 7 posiciones, índice = `Date.getDay()`, 0=domingo…6=sábado; cada posición es un array de `{ open: 'HH:MM', close: 'HH:MM' }` con `'24:00'` para medianoche; días cerrados = `[]`) y la función `isWithinOpeningHours(localDate)` que devuelve `{ open: boolean, reason?: string }`. No duplicar en ningún otro fichero.
  - `backend/src/validators/reservations.js` — schema Zod para `POST /api/reservations`. Valida `date` ("YYYY-MM-DD"), `time` ("HH:MM" 24h), `zone` (enum `interior|terrassa|barra`), `guests` (entero 1–20). Incluye campo honeypot `_honey`.
  - `backend/src/services/reservationService.js` — lógica de negocio: parsea `date`+`time` como hora local de Europe/Madrid (usando `Intl.DateTimeFormat` con la corrección de offset DST, sin dependencias externas), rechaza fechas pasadas, llama a `isWithinOpeningHours`. Retorna `{ availableSlots: [] }` (MVP: el admin contacta al cliente para confirmar).
  - `backend/src/controllers/reservationController.js` — handler `createReservation`: valida con Zod y delega en el servicio.
  - `backend/src/routes/reservations.js` — `POST /` con `reservationLimiter + honeypot + createReservation`.

  **Ficheros modificados:**
  - `backend/src/middleware/rateLimiter.js` — añadido `reservationLimiter` (5 req/IP/hora).
  - `backend/src/index.js` — importado e instalado `reservationsRoutes` en `/api/reservations`.

- **Horarios implementados** (Europe/Madrid):

  | Día | Franja(s) |
  |-----|-----------|
  | Lunes | CERRADO |
  | Martes | CERRADO |
  | Miércoles | 18:00–23:30 |
  | Jueves | 18:00–23:30 |
  | Viernes | 18:00–24:00 |
  | Sábado | 11:00–16:00 y 19:00–24:00 |
  | Domingo | 11:00–16:00 |

- **Contrato del endpoint**:

  ```
  POST /api/reservations
  Content-Type: application/json
  Body: { "date": "YYYY-MM-DD", "time": "HH:MM", "zone": "interior|terrassa|barra", "guests": 1-20 }

  Respuesta 200 OK:
  { "availableSlots": [] }

  Errores:
    422 (Zod) — body invalido: { "error": "Validation error", "issues": [...] }
    422 — dia cerrado: { "error": "El restaurante esta tancat aquell dia" }
    422 — hora fuera de rango: { "error": "La franja horaria sol·licitada esta fora de l'horari d'obertura (HH:MM-HH:MM)" }
    422 — fecha/hora en el pasado: { "error": "No es pot fer una reserva en una data o hora ja passada" }
    403 — honeypot relleno: { "error": "Forbidden" }
    429 — rate limit: { "error": "Too many requests. Please try again later." }
  ```

- **Supuesto de formato/zona horaria**: el frontend envia `date` como cadena `"YYYY-MM-DD"` (valor del `<input type="date">`) y `time` como `"HH:MM"` (select de horas). Ambas se interpretan en la zona Europe/Madrid. El servidor usa `Intl.DateTimeFormat` con `timeZone: 'Europe/Madrid'` para corregir el offset DST sin necesitar librerias externas.

- **Regla de validacion de horario**: `open <= H < close` para algun rango del dia (limite inferior inclusivo, limite superior exclusivo). Medianoche se codifica como `'24:00'` (= 1440 min) para que la comparacion de enteros funcione sin aritmetica circular.

- **Verificacion**: `node --check` OK en todos los ficheros tocados. 20 casos limite ejecutados en Node directamente — todos pasan.

- **Impacto para otros agentes**:
  - `frontend-react`: el punto de integracion en `Reservas.jsx` (marcado `// TODO`) puede conectarse a `POST /api/reservations` con body `{ date, time, zone, guests }`. Si el servidor devuelve 422, mostrar el `error` del body al usuario.
  - `testing-expert`: tests de integracion recomendados: (1) dia cerrado → 422; (2) hora fuera de rango → 422; (3) dentro de horario → 200; (4) fecha pasada → 422; (5) honeypot relleno → 403; (6) rate limit → 429.

- **Accion requerida**:
  - `frontend-react`: conectar el submit de `Reservas.jsx` al endpoint real.
  - El negocio debe confirmar los horarios en `backend/src/config/openingHours.js` antes de produccion (cambio de horario = un solo fichero).

### [2026-06-16] backend-node — Catálogo expone `ingredients[]` + opción "Boniato" en hamburguesas

- **Qué cambió**:
  - `backend/src/services/catalogService.js`: `GET /api/catalog` ahora incluye `ingredients: string[]` por producto (antes se omitía pese a existir en BD). Añadido `ingredients` al `include` de Prisma y al mapeo de respuesta. Con esto el `ProductModal` (que ya renderiza checkboxes de ingredientes removibles desde `product.ingredients`) por fin los muestra; el cliente puede quitar ingredientes (`removedIngredients` por línea en `POST /api/orders`).
  - `backend/prisma/seedCatalog.js`: añadida la opción **"Boniato"** (priceDelta 0) al grupo "Elige tu acompañante" de las hamburguesas (ahora Bravas/Fritas/Boniato). Re-seed ejecutado.
- **Contexto**: la captura del usuario (modal con "Lorem Ipsum"/"Bravas" duplicado y foto) era un mockup de diseño antiguo; la BD real ya tenía 186 ingredientes y 18 grupos de opciones bien formados. El modal real no muestra foto (no hay `<img>`), así que "que no se vea la foto" ya se cumplía.
- **Verificación**: `GET /api/catalog` → Frank Costello con `ingredients:[Lechuga,Tomate,Pepinillo,Bacon,Queso,Salsa tártara]` y acompañante `Bravas/Fritas/Boniato`. `node --check` OK.
- **Nota**: re-seedear el catálogo recrea productos con nuevos UUID (referencia blanda desde `OrderLine`). Sin pedidos reales todavía → sin impacto. Tenerlo en cuenta cuando existan pedidos.

### [2026-06-16] frontend-react — Horarios reales en Reservas + fuente única `data/hours.js`

- **Qué cambió**:
  - `frontend/src/data/hours.js` (nuevo): fuente única de verdad de horarios de apertura. Exporta:
    - `OPENING_HOURS` — mapa por día JS (0=domingo … 6=sábado), cada entrada lista de rangos `{ open, close }` en 'HH:MM'. Días cerrados = `[]`. Medianoche = `'24:00'`.
    - `FOOTER_HOURS` — array de filas para la tabla del footer (texto display). Derivado fijo de `OPENING_HOURS`; único lugar donde se define el texto legible.
    - Helpers: `isOpenDay(dayIndex)`, `closedDayMessage(dayIndex)`, `getSlotsForDay(dayIndex)` (slots cada 30 min, último = cierre − 30 min), `timeToMinutes`, `minutesToTime`.
  - `frontend/src/components/Footer.jsx`: eliminada la constante `HOURS` local; ahora importa `FOOTER_HOURS` de `data/hours.js`. Markup visual idéntico.
  - `frontend/src/pages/Reservas.jsx`: refactorizado completo del campo de fecha y hora:
    - `DEFAULT_DATE` y `TIME_SLOTS` mock eliminados.
    - Campo `date`: `min` = hoy (formato YYYY-MM-DD calculado en cliente). Validación en `onChange` y en `validate()`: fecha pasada → error; día cerrado (lun/mar) → mensaje `closedDayMessage()`. El `input[type=date]` no puede deshabilitar días específicos nativamente; se valida por cambio + submit.
    - Campo `time`: slots generados con `getSlotsForDay(dayOfWeek)` via `useMemo([date])`. Si no hay fecha válida → `disabled` con texto "Primero elige un día abierto". Si el usuario cambia fecha a otro día y la hora previa ya no está en los nuevos slots → se resetea y se limpia su error.
    - Medianoche manejada: `'24:00'` = 1440 min. El último slot de viernes/sábado es `23:30` (1440 − 30 = 1410 min). Correcto.
    - `role="alert"` añadido a los párrafos de error del formulario (accesibilidad).
    - Comentario indicando que `POST /api/reservations` validará esto también en el servidor (cliente = UX only).
- **Por qué**: los slots mock (13:00–16:30 / 19:30–22:30) no coincidían con los horarios reales del negocio. Petición explícita del usuario.
- **Verificación**: `npm run build` → 82 módulos, 0 errores, 0 warnings.
- **Supuestos**:
  - La lógica de parseo de YYYY-MM-DD usa `new Date(y, m-1, d)` (partes numéricas) para evitar el desplazamiento de zona horaria que produce `new Date('YYYY-MM-DD')`.
  - `FOOTER_HOURS` es un array derivado fijo (no calculado desde `OPENING_HOURS` algorítmicamente) porque las etiquetas de texto del footer ("Miércoles a jueves", etc.) son editoriales y no se pueden generar automáticamente. Si cambian los horarios, hay que actualizar ambas exportaciones de `hours.js`, pero siguen viviendo en el mismo archivo.
- **Impacto para otros agentes**:
  - `backend-node`: cuando se implemente `POST /api/reservations`, debe revalidar que `date+time` caen dentro de los horarios reales (los datos de `OPENING_HOURS` son la fuente de verdad para el frontend; el backend necesita su propia copia/lógica equivalente).
  - `testing-expert`: nuevos casos: (a) elegir lunes → error visible, botón bloqueado; (b) elegir miércoles → slots 18:00–23:00; (c) elegir viernes → slots 18:00–23:30; (d) elegir sábado → slots 11:00–15:30 y 19:00–23:30; (e) elegir domingo → slots 11:00–15:30; (f) cambiar de viernes a domingo → hora previa reseteada si no existe en el nuevo set.
- **Acción requerida**: ninguna inmediata. El número de WhatsApp sigue siendo placeholder (`34XXXXXXXXX`).

### [2026-06-16] frontend-react — Header reactivo al estado de sesión

- **Qué cambió** (`frontend/src/components/Header.jsx`, `frontend/src/index.css`):
  - El header consume `useAuth()`. El enlace "Iniciar Sesión" se retiró de `NAV_LINKS` (estático) y ahora el control de sesión es condicional:
    - No autenticado → enlace "Iniciar Sesión" (`/login`).
    - Autenticado → saludo "Hola, {firstName}" (clase `.nav-user`, color marca) + botón "Cerrar sesión" (`logout()` → `navigate('/')`). Si `role === 'ADMIN'`, además un enlace "Panel" (`/adminoffice`).
    - Mientras `loading` (me-check en vuelo) no se renderiza nada para evitar el parpadeo del control incorrecto.
  - CSS nuevo: `.nav-link--button` (reset de `<button>` para que iguale a un `.nav-link`) y `.nav-user`.
- **Por qué**: tras login/registro el header seguía mostrando "Iniciar Sesión"; no reflejaba la sesión. Petición del usuario.
- **Verificación**: `npm run build` OK. Funciona tanto en desktop como en el menú hamburguesa (el control va dentro de `<nav id="main-nav">`).

### [2026-06-16] frontend-react — Registro real conectado a `POST /api/auth/register`

- **Qué cambió**:
  - `frontend/src/services/authService.js`: nueva `registerRequest(data)` (POST `/api/auth/register`, `credentials: 'include'`). Mapea errores comunes a castellano: 409→"Ya existe una cuenta…", 422→aviso de teléfono/contraseña, 429→demasiados intentos.
  - `frontend/src/pages/Registro.jsx`: eliminado el submit mock (`console.info('[Registro] Mock submit OK')`). `handleSubmit` ahora es async y llama a `registerRequest` con el contrato real `{ name, apellidos, email, password, phone, consentConditions, consentPrivacy, consentMarketing }`. Tras 201, el backend ya deja la cookie de sesión (auto-login) → `login()` hidrata el estado y el modal de bienvenida lleva al home (`/`).
  - **Añadido campo de contraseña** (no existía y el backend lo exige): estado `password`, validación min 8, input con `LockIcon` y `autoComplete="new-password"`. Estado `submitting` deshabilita el botón ("Creando cuenta…").
- **Verificación E2E** (backend local + curl): registro válido → 201 `{ user }` + `Set-Cookie lcn_token` httpOnly SameSite=Lax; usuario persistido en BD (role CUSTOMER, consentimientos guardados); email duplicado → 409. `npm run build` OK.
- **Notas / pendiente**:
  - Login ya estaba conectado; ahora Registro también. Falta el flujo de "recuperar contraseña" (sin endpoint).
  - El backend exige teléfono español válido (`libphonenumber-js`, ES) y password 8–72; la validación de cliente es laxa y el servidor re-valida (muestra el 422 mapeado).
  - RGPD: contraseña y datos personales nunca se loguean.

### [2026-06-16] frontend-react — Google SSO integrado en Login y Registro

- **Qué cambió**:

  **Ficheros nuevos:**
  - `frontend/src/components/GoogleSignInButton.jsx`: componente reutilizable que carga el script de Google Identity Services dinámicamente (tolerante a doble carga), inicializa `google.accounts.id` con `VITE_GOOGLE_CLIENT_ID`, renderiza el botón oficial GIS (`renderButton`), llama a `googleLoginRequest()` en el callback y expone `onSuccess(data)` / `onError(message)` al padre. Si `VITE_GOOGLE_CLIENT_ID` está vacío, no renderiza nada (sin error). Flujo popup (`ux_mode: 'popup'`).
  - `frontend/.env.example`: nuevo fichero con `VITE_API_URL` y `VITE_GOOGLE_CLIENT_ID` documentadas. Instrucciones para obtener el Client ID en Google Cloud Console y los orígenes a añadir (`http://localhost:5173`, `https://jrero99.github.io`).

  **Ficheros modificados:**
  - `frontend/src/services/authService.js`: nueva función `googleLoginRequest(credential)` — `POST /api/auth/google` con `credentials: 'include'`. Mensajes de error localizados por código HTTP (401/403/422/429/503). El credential se descarta tras el envío.
  - `frontend/src/pages/Login.jsx`: importa `GoogleSignInButton`; añade `handleGoogleSuccess()` que llama a `login()` (hidrata `AuthContext` via `GET /api/auth/me`) y redirige a `location.state.from` o `/`. El botón y el separador "o" se renderizan antes del formulario de email/contraseña.
  - `frontend/src/pages/Registro.jsx`: ídem; `handleGoogleSuccess()` navega a `/` (el backend hace find-or-create, no es necesario el modal de bienvenida). Añadido `serverError` state para errores de Google SSO.
  - `frontend/src/index.css`: nuevas clases `.auth-sso-separator`, `.google-signin-wrapper`, `.google-signin-button-container`, `.google-signin-loading`.
  - `frontend/index.html`: `<script src="https://accounts.google.com/gsi/client" async defer>` añadido en `<head>`. El componente también tolera que el script no esté cargado aún (espera el evento `load`).

- **Por qué**: Integración del endpoint `POST /api/auth/google` implementado por `backend-node` (entrada del 2026-06-16).

- **Flujo de usuario**:
  1. El usuario accede a `/login` o `/registro`.
  2. Ve el botón oficial de Google encima del formulario de email/contraseña.
  3. Al pulsar, se abre el popup de selección de cuenta de Google.
  4. Google devuelve un ID token al callback del componente.
  5. `googleLoginRequest` hace `POST /api/auth/google { credential }` con `credentials: 'include'`.
  6. El backend verifica el token, hace find-or-create y setea la cookie JWT httpOnly.
  7. El componente llama a `onSuccess(data)`, que invoca `login()` en `AuthContext` → `GET /api/auth/me`.
  8. La app redirige al destino original (ruta guardada por `ProtectedRoute`) o a `/`.
  - En caso de error: el mensaje del servidor (o el texto localizado por código HTTP) se muestra en el `<p role="alert">` ya existente en cada página. El formulario de email/contraseña sigue disponible.
  - Si `VITE_GOOGLE_CLIENT_ID` no está configurado: el botón no aparece, sin error ni excepción. La página funciona exactamente igual que antes del cambio.

- **Supuestos / pendiente**:
  - El OAuth 2.0 Web Client ID debe crearse en Google Cloud Console y añadirse a `.env.local` como `VITE_GOOGLE_CLIENT_ID` y al `.env` del backend como `GOOGLE_CLIENT_ID`.
  - En producción (GitHub Pages), el botón solo funcionará una vez que el backend esté desplegado con `GOOGLE_CLIENT_ID` configurado.
  - Si el usuario bloquea el script de Google (uBlock, Firefox Enhanced Privacy), el botón no aparece y el formulario de email/contraseña funciona normalmente.
  - RGPD (deuda existente): usuarios creados por SSO tienen `acceptedTerms/Privacy: true` automáticamente sin consentimiento explícito. Bloqueante legal antes de producción (registrado en riesgos abiertos).

- **Impacto para otros agentes**:
  - `testing-expert`: nuevos casos a cubrir: (1) `VITE_GOOGLE_CLIENT_ID` ausente → botón no renderizado; (2) Google SSO exitoso → sesión hidratada y redirección; (3) token inválido → mensaje de error visible; (4) backend 503 → mensaje de error localizado.
  - `qa-expert`: verificar en móvil que el popup de Google no queda cortado; verificar que el separador "o" es visible a 360px; target ≥44px en el botón oficial de GIS.

- **Acción requerida**:
  - Configurar `VITE_GOOGLE_CLIENT_ID` en `.env.local` del frontend y `GOOGLE_CLIENT_ID` en `.env` del backend.
  - Google Cloud Console: crear/configurar el Web Client ID con los orígenes autorizados (ver `.env.example`).

- **Build verificado**: `npm run build` → 0 errores, 0 warnings. 81 módulos transformados.

### [2026-06-16] backend-node — Google SSO: `POST /api/auth/google` + modelo híbrido

- **Qué cambió**:

  **Modelo de datos (`prisma/schema.prisma`)**
  - `passwordHash` ahora es **nullable** (`String?`): usuarios creados solo con Google no tienen contraseña local.
  - Nuevo campo `googleId String? @unique @map("google_id")`: el `sub` del token de Google. Null para usuarios de contraseña que nunca han vinculado Google.
  - Nuevo enum `AuthProvider { PASSWORD GOOGLE }` y campo `provider AuthProvider @default(PASSWORD)` en `User`. Híbrido: si un usuario de contraseña vincula Google, `provider` queda como `PASSWORD` pero `googleId` se rellena (puede entrar por ambas vías).
  - Migración: `prisma/migrations/20260616000000_add_google_sso/migration.sql`. Aplicada (`prisma migrate deploy`). Prisma client regenerado.

  **Ficheros nuevos/modificados en `backend/`**:
  - `src/services/authService.js` — nueva función `loginWithGoogle(credential)`: verifica el ID token con `OAuth2Client.verifyIdToken`, extrae `sub/email/email_verified/name`, implementa la lógica find-or-create (ver decisión de vinculación abajo). El bloque `login()` por contraseña ahora rechaza con `401` usuarios sin `passwordHash` (Google-only) manteniendo el mensaje genérico (no revela la causa).
  - `src/controllers/authController.js` — nuevo handler `googleAuth`: parsea con `googleAuthSchema`, llama a `loginWithGoogle`, emite la misma cookie JWT httpOnly que `login`. El credential nunca se logea (RGPD).
  - `src/routes/auth.js` — nueva ruta `POST /api/auth/google` con `googleAuthLimiter`. No usa honeypot (no es un formulario HTML).
  - `src/validators/auth.js` — nuevo `googleAuthSchema`: valida `credential` (string, 100–4096 chars).
  - `src/middleware/rateLimiter.js` — nuevo `googleAuthLimiter`: 10 req/IP cada 15 min.
  - `src/config/env.js` — nuevo campo `googleClientId` (opcional en dev, `null` si no está). Si no está configurado, el endpoint devuelve `503`.
  - `.env.example` — nueva variable `GOOGLE_CLIENT_ID` documentada.
  - `package.json` — nueva dependencia `google-auth-library` instalada (`npm install`).

  **Decisión de vinculación por email** (documentada también en `authService.js`):
  - Si hay usuario con ese `googleId` → login directo.
  - Si hay usuario con ese `email` (registrado por contraseña) → se vincula setando `googleId`; el usuario puede loguear por ambas vías. Esto evita cuentas duplicadas.
  - Si no existe → se crea con `role: CUSTOMER`, `provider: GOOGLE`, `passwordHash: null`. NUNCA puede crearse un ADMIN por esta vía.

- **Por qué**: Petición explícita del usuario. Añadir SSO con Google manteniendo la sesión unificada (misma cookie JWT httpOnly).

- **Contrato del endpoint nuevo**:

  ```
  POST /api/auth/google
  Content-Type: application/json
  Body: { "credential": "<google_id_token_string>" }

  Respuesta 200 OK (login o registro exitoso):
  Set-Cookie: lcn_token=<jwt>; HttpOnly; SameSite=Lax; Path=/; [Secure en prod]
  { "user": { "id": "uuid", "email": "...", "name": "Nombre Apellido", "role": "CUSTOMER" } }

  Errores:
    422  — body inválido (credential ausente o fuera de longitud)
    401  — token de Google inválido o expirado
    403  — email no verificado por Google | cuenta eliminada (soft-delete)
    429  — rate limit (10 req/IP/15min)
    503  — GOOGLE_CLIENT_ID no configurado en el servidor
  ```

- **Variables de entorno nuevas**:
  - `GOOGLE_CLIENT_ID` (backend `.env`): OAuth 2.0 Web Client ID de Google Cloud Console. Opcional en dev (el endpoint devuelve 503 si falta).
  - El frontend también necesita el mismo valor como **`VITE_GOOGLE_CLIENT_ID`** (public, seguro de exponer) para inicializar Google Identity Services en el cliente.

- **Qué necesita el frontend para integrar**:
  1. Cargar el script de Google Identity Services: `<script src="https://accounts.google.com/gsi/client" async>`.
  2. Inicializar con `google.accounts.id.initialize({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, callback: handleCredentialResponse })`.
  3. En `handleCredentialResponse(response)`: hacer `POST /api/auth/google` con body `{ credential: response.credential }` y `credentials: 'include'`.
  4. Tras respuesta 200, re-hidratar el `AuthContext` con `GET /api/auth/me` (igual que el flujo de login por contraseña ya hace en `Login.jsx`).
  5. El botón visual puede ser el botón de Google (`google.accounts.id.renderButton`) o un botón custom que dispare `google.accounts.id.prompt()`.

- **Impacto para otros agentes**:
  - `frontend-react`: implementar el botón de "Continuar con Google" en `Login.jsx` y `Registro.jsx`. Necesita `VITE_GOOGLE_CLIENT_ID` en `.env.local`. El flujo post-login es idéntico al actual (cookie + `GET /api/auth/me`).
  - `testing-expert`: tests de integración nuevos: (1) token válido → 200 + cookie; (2) token inválido → 401; (3) `email_verified: false` → 403; (4) usuario existente con mismo email → vincula googleId, no crea duplicado; (5) sin `GOOGLE_CLIENT_ID` configurado → 503.
  - `security-expert`: revisar que `audience` en `verifyIdToken` está fijado al `GOOGLE_CLIENT_ID` correcto (ya implementado). El token nunca se logea. El endpoint no acepta el payload del token directamente del cliente.

- **Acción requerida**:
  - `frontend-react`: añadir botón de Google SSO en páginas de login/registro.
  - Configurar el OAuth 2.0 Web Client en Google Cloud Console y añadir `GOOGLE_CLIENT_ID` al `.env` del backend y `VITE_GOOGLE_CLIENT_ID` al `.env.local` del frontend.
  - En Google Cloud Console: añadir `http://localhost:5173` y `https://jrero99.github.io` como orígenes JavaScript autorizados.

### [2026-06-14] frontend-react — Catálogo dinámico: `fetchCatalog()` consume `GET /api/catalog`

- **Qué cambió**:
  - `frontend/src/services/catalogService.js`: `fetchCatalog()` ahora hace `fetch(\`${API_BASE_URL}/api/catalog\`)` (antes devolvía el mock `CATEGORIES`). Eliminada la dependencia de `catalogMockData.js`. Lanza error si la respuesta no es OK (los consumidores ya tienen estado de error + reintento).
  - `frontend/.env.local` (NO versionado, `.env.*` ignorado): `VITE_API_URL=http://localhost:3001` para que el dev server (Vite :5173) llame al backend local.
  - `frontend/src/data/allergens.js` (nuevo): mapa de los 14 alérgenos UE → etiqueta legible (`lacteos`→`Lácteos`, `frutos-de-cascara`→`Frutos de cáscara`, `sesamo`→`Sésamo`...). `formatAllergens(names)`. El backend devuelve nombres normalizados; este helper los presenta con acentos. Fallback capitaliza valores desconocidos.
  - `ProductCard.jsx`, `ProductModal.jsx`, `Carta.jsx`: usan `formatAllergens(product.allergens)` en vez de `.join(', ')`.
- **Verificación**: backend levantado y `GET /api/catalog` → HTTP 200, 12 categorías / 82 productos, cabeceras CORS correctas para `http://localhost:5173`. `npm run build` del frontend OK (0 errores).
- **Cómo probar en local**: terminal 1 → `cd backend && npm run dev`; terminal 2 → `cd frontend && npm run dev`. La carta y el flujo de pedido cargan desde la BD.
- **Pendiente / notas**:
  - En producción (GitHub Pages) el catálogo NO carga: el backend sigue sin desplegar. `VITE_API_URL` vacío → ruta relativa sin servidor. Esperado.
  - `catalogMockData.js` queda huérfano (ya nadie lo importa). Conservado como referencia de contrato; se puede borrar más adelante.
  - El endpoint devuelve `options[].choices[].priceExtra`; la UI aún no suma ese suplemento al total (todos los priceDelta actuales son 0).

### [2026-06-14] backend-node — Seed del catálogo completo (`backend/prisma/seedCatalog.js`)

- **Qué cambió**:
  - Nuevo archivo `backend/prisma/seedCatalog.js` (ESM, mismo estilo que `seed.js`).
  - Seed idempotente del catálogo completo de La Casa Nostra: 12 categorías, 80 productos, 14 alérgenos UE, ingredientes removibles y grupos de opciones para hamburguesas.
  - Nuevo script en `backend/package.json`: `"prisma:seed:catalog": "node prisma/seedCatalog.js"`.
  - Sintaxis verificada con `node --check` → OK.

- **Estrategia de idempotencia**:
  - Categorías: `upsert` por `slug` (clave estable).
  - Alérgenos: `upsert` por `name`.
  - Productos: borrar-y-recrear por categoría (`deleteProductsByCategory` elimina en cascada `productAllergens`, `optionChoices`, `optionGroups`, `ingredients` y luego `products`). Las `orderLines` existentes quedan con `productId = null` (referencia blanda nullable en el schema).

- **Categorías incluidas** (slugs exactos del mock):
  `classics` (20 productos), `tapas` (10), `salads` (6), `burgers` (9), `vegetarians` (5), `chicken` (6), `sandwiches` (4), `american` (2), `pork-loin` (2), `loins` (3), `combos` (10), `desserts` (5). Total: 82 productos. La categoría `drinks` NO está incluida (la carta PDF no trae bebidas).

- **Alérgenos**: 14 alérgenos UE creados con emoji de icono. Asignados a cada producto por inferencia conservadora a partir de ingredientes. **No validados por especialista** — comentario de aviso legal en cabecera del archivo.

- **Opciones (OptionGroup/OptionChoice)**: Las hamburguesas (categoría `burgers`) tienen dos grupos: "Elige tu acompañante" (Bravas/Fritas) y "Elige tu salsa" (Brava/Alioli/BBQ/César/Mostaza y miel/Sin salsa), todos con `priceDelta 0`. Equivale a `BURGER_OPTIONS` del mock.

- **Opciones NO modeladas** (documentadas en comentario al final del archivo):
  - "Sin gluten +1,50 EUR"
  - "Pan gallego +0,50 EUR"
  - "Hamburguesa 200g +2,00 EUR"
  - "Americanos: cambiar salchicha por cervela 190g +1,00 EUR"

- **Por qué**: Petición explícita del usuario — seed listo para ejecutar en cuanto la BD esté migrada.

- **Cómo ejecutar**:
  ```
  # Prerequisito: BD migrada (npx prisma migrate dev --name init)
  cd backend
  npm run prisma:seed:catalog
  ```

- **Impacto para otros agentes**:
  - `frontend-react`: cuando el backend arranque, `GET /api/catalog` devolverá los datos de esta tabla. El shape es compatible con `catalogMockData.js`. Desbloquear el fetch real en `frontend/src/services/catalogService.js`.
  - `testing-expert`: tests de integración de `GET /api/catalog` pueden basarse en los slugs y nombres de producto de este seed.
  - Alérgenos: revisar con el negocio antes de producción (requisito legal UE).

- **Acción requerida**:
  - El negocio debe revisar y validar los alérgenos asignados a cada producto ANTES de poner en producción.
  - Las cuatro opciones documentadas (sin gluten, pan gallego, 200g, cervela) quedan pendientes de decisión del usuario para una iteración futura.

### [2026-06-14] frontend-react — Backoffice admin `/adminoffice` + auth real + ProtectedRoute

- **Qué cambió**:

  **1. Auth real (`AuthContext`, `Login.jsx`, `authService.js`)**
  - `frontend/src/services/authService.js` (nuevo): exporta `loginRequest`, `logoutRequest`, `getMeRequest`. Todos usan `credentials: 'include'` — el JWT viaja en cookie httpOnly, nunca en JS. NUNCA se loguean credenciales ni datos personales.
  - `frontend/src/context/AuthContext.jsx` (reescrito): ya NO usa `sessionStorage` ni mock. Al montar, llama a `GET /api/auth/me` para hidratar el estado desde el servidor. Expone `{ isAuthenticated, user: { id, email, firstName, lastName, role }, loading, login, logout }`. `loading: true` mientras se resuelve el me-check (evita redirección prematura).
  - `frontend/src/pages/Login.jsx` (actualizado): llama a `POST /api/auth/login` con `credentials: 'include'`, luego re-hidrata con `GET /api/auth/me` via `login()`. Muestra errores del servidor. Redirige a `location.state.from` (ruta guardada por ProtectedRoute) o a `/` si no hay.

  **2. ProtectedRoute (`frontend/src/components/ProtectedRoute.jsx`, nuevo)**
  - Props: `children`, `requireAdmin` (bool, default false).
  - Mientras `loading` → spinner (evita redirección prematura).
  - No autenticado → `<Navigate to="/login" state={{ from: pathname }} />`.
  - Autenticado pero `role !== 'ADMIN'` (cuando `requireAdmin=true`) → mensaje 403 inline.
  - Comentarios: la seguridad real la impone el backend; esto es UX solamente.

  **3. Backoffice `/adminoffice` (`frontend/src/pages/AdminOffice.jsx` + subcomponentes)**
  - Layout dos columnas: sidebar fijo (desktop ≥860px) + tab bar horizontal (móvil <860px).
  - NO enlazado desde ninguna página pública. El admin accede por URL directa.
  - Cuatro secciones en `frontend/src/pages/admin/`:
    - `AdminOrders.jsx`: tabla de pedidos con filtro por estado, selector para cambiar estado via `PATCH /api/admin/orders/:id`, confirmación con nota interna usando `Modal` genérico.
    - `AdminCatalog.jsx`: productos agrupados por categoría (incluyendo no disponibles), crear/editar/eliminar con formulario en `Modal` genérico.
    - `AdminUsers.jsx`: tabla de usuarios CUSTOMER, drawer inline con direcciones (`GET /api/admin/users/:id/addresses`). RGPD: datos personales NO se loguean.
    - `AdminBlacklist.jsx`: ver/añadir/eliminar entradas, badge de expiración, confirmaciones via `Modal` genérico.
  - Todos los subcomponentes: estados de carga, error (con "Reintentar") y vacío.
  - Botón "Cerrar sesión" en sidebar llama a `logout()` → `POST /api/auth/logout`.

  **4. Capa de servicios (`frontend/src/services/adminService.js`, nuevo)**
  - Centraliza todos los fetch de `/api/admin/*` con `credentials: 'include'`.
  - Helper `adminFetch` maneja errores HTTP y parsea mensajes del servidor.
  - Funciones: `fetchAdminOrders`, `updateOrderStatus`, `fetchAdminCatalog`, `createProduct`, `updateProduct`, `deleteProduct`, `fetchAdminUsers`, `fetchUserAddresses`, `fetchBlacklist`, `addBlacklistEntry`, `deleteBlacklistEntry`.

  **5. Routing (`frontend/src/App.jsx` actualizado)**
  - Nueva ruta `/adminoffice` envuelta en `<ProtectedRoute requireAdmin>`.
  - AdminOffice renderiza su propio layout (sin Header/Footer público).
  - Rutas públicas envueltas en helper `PublicLayout` (Header + main + Footer).
  - Build verificado: 0 errores, 0 warnings.

  **6. CSS (`frontend/src/index.css`)**
  - Clases nuevas `.protected-route-*` para loading/403.
  - Clases con prefijo `.admin-*`: layout panel, tablas, badges de estado, botones (primary/secondary/danger/sm), paginación, modales de admin, drawer de direcciones.
  - Responsive: sidebar oculto en <860px; tab bar horizontal visible. Acciones de modal apiladas en ≤520px.

- **Por qué**: Petición explícita del usuario.

- **Supuestos / pendiente**:
  - Gestión de alérgenos en formulario de producto NO implementada (solo nombre, descripción, precio, categoría, disponible). Iteración futura.
  - La ruta `/adminoffice` no funciona en GitHub Pages (backend no desplegado). Solo en desarrollo local.
  - `GET /api/admin/users/:id/addresses` acepta `{ addresses[] }` o `[]` directamente (el servicio normaliza ambas formas).

- **Impacto para otros agentes**:
  - `testing-expert`: flujos críticos: (1) visitar `/adminoffice` sin auth → redirige a `/login`; (2) login non-admin → 403; (3) login admin → panel visible; (4) logout → limpia estado; (5) cada sección: loading → data → error+retry.
  - `qa-expert`: verificar panel en 360px sin overflow; tab bar con scroll horizontal; targets ≥44px; focus trap en Modal de confirmación.
  - `security-expert`: verificar que `SameSite=Lax` en cookie sea suficiente para el panel admin. El frontend no envía ningún token en header.

- **Acción requerida**:
  - `testing-expert`: tests de los flujos de ProtectedRoute y panel admin.

### [2026-06-14] dispatcher — Revisión y corrección del andamiaje no solicitado de `backend/`

- **Qué cambió**: El usuario encargó SOLO el diseño de BD (ERD + `schema.prisma`), pero `backend-node` andamió además el backend Express completo (~28 archivos). El usuario eligió "revisarlo y corregirlo". Tras auditoría (Explore) se aplicaron correcciones:
  - **Eliminada toda la funcionalidad de RESERVAS** (contradecía la decisión "sin reservas en BD por ahora" y no tenía tabla en el schema): borrados `routes/reservations.js`, `controllers/reservationController.js`, `services/reservationService.js`, `validators/reservations.js`; retirados import y `app.use` en `index.js`; retirado `reservationLimiter` de `rateLimiter.js`. Con ello desaparecen también los aforos/horarios inventados (`ZONE_CAPACITY`, slots 13:00–22:30) que vivían en el service de reservas.
  - **Retirado código OTP muerto**: `verifyPhoneLimiter` (no usado) eliminado de `rateLimiter.js` y de `routes/auth.js`. OTP/SMS sigue como deuda futura (sin proveedor).
  - **Turnstile**: bloque de config muerto retirado de `config/env.js` y de `.env.example` (estaba configurado pero NUNCA validado → falsa sensación de protección). Documentado como pendiente futuro.
  - **JWT**: default de `jwtExpiresIn` corregido de `7d` a `15m` (alineado con `.env.example` y con el hallazgo ALTO de security-expert).
  - **Admin email**: `seed.js` ahora lee `ADMIN_EMAIL` de env con default al email real del negocio (`lacasanostramataro@gmail.com`, ver `frontend/src/data/business.js`). No estaba inventado.
- **Verificación**: `node --check` OK en todos los archivos tocados; `grep` confirma 0 referencias colgantes a reservas/limiters/turnstile.
- **Pendiente NO corregido (requiere decisión, no tocado)**: en `orderService.js` se calculan `fraudFlags` pero `orderController.js` los ignora (no se persisten ni se muestran al admin). Recomendación: persistirlos en `OrderStatusHistory.note` o devolverlos al panel admin. Dejado como está para no alterar lógica de negocio sin confirmación.
- **Impacto para otros agentes**:
  - `backend-node`: el backend NO está instalado (sin `node_modules`) ni migrado. El andamiaje queda como base a revisar cuando se decida arrancar el backend formalmente. No reintroducir reservas sin decisión del usuario.
  - `frontend-react`: `Reservas.jsx` sigue siendo mock en cliente; no hay endpoint de reservas en backend (correcto).
- **Acción requerida**: Decisión del usuario sobre el flujo de `fraudFlags`. Confirmar si se autoriza arrancar/instalar el backend.

### [2026-06-14] security-expert — Auditoría de seguridad del andamiaje de `backend/`

- **Qué cambió**: Revisión estática completa del código de `backend/` generado por backend-node. Sin modificaciones de código; solo hallazgos y recomendaciones.
- **Por qué**: Petición explícita del usuario antes de autorizar la integración con frontend.
- **Hallazgos principales**:
  - ALTO: JWT firmado con expiración de 7 días (default en `config.jwtExpiresIn`) mientras la cookie tiene maxAge de 7 días. La ventana de ataque en caso de robo de cookie es de 7 días. Recomendación: JWT a 15 min + refresh token rotation (tabla lista en schema).
  - ALTO: Rate limiting por cuenta (login) está en Map en memoria — se reinicia con el proceso.
  - MEDIO: Transiciones de estado de pedido no restringidas (admin puede poner DELIVERED -> PENDING).
  - MEDIO: choiceIds de opciones no se validan como pertenecientes al producto del item.
  - BAJO: `?status=` en listOrders sin validar contra enum. Dependencia transitiva tar vulnerable.
- **Impacto para otros agentes**:
  - `backend-node`: ver informe completo en el mensaje del security-expert. Bloqueantes para producción: JWT lifetime + refresh tokens. Para el MVP local son aceptables con advertencia.
  - `frontend-react`: puede continuar la integración. El contrato de API es correcto y seguro en lo esencial.
- **Acción requerida**:
  - `backend-node`: (1) Reducir `JWT_EXPIRES_IN` a "15m" y `maxAge` de cookie a 15 min, o implementar refresh token rotation. (2) Mover el contador de fallos de login a Redis cuando se escale. (3) Añadir validación de enum en `?status=`. (4) Validar que choiceIds pertenecen al producto. (5) `npm audit fix` para resolver tar.


### [2026-06-14] backend-node — Andamiaje completo de `backend/` (Node + Express + Prisma + auth + admin)

- **Qué cambió**: Primera implementación real del backend de LCN. Creados todos los ficheros de la API.

#### Ficheros nuevos en `backend/`

```
prisma/schema.prisma  (schema aprobado, ya existía — sin cambios)
prisma/seed.js        Crea lacasanostramataro@gmail.com como ADMIN (argon2id)
src/config/env.js     Variables de entorno validadas al arranque
src/config/prisma.js  Singleton PrismaClient
src/middleware/auth.js          requireAuth + requireAdmin (rol desde BD, nunca desde token)
src/middleware/cors.js          CORS manual restringido a origenes configurados
src/middleware/errorHandler.js  Manejo global (Zod 422, Prisma P2002, JWT, HTTP ops)
src/middleware/honeypot.js      Rechaza si campo _honey viene relleno
src/middleware/rateLimiter.js   express-rate-limit por endpoint
src/middleware/requestLogger.js RGPD: solo timestamp|método|path|status|sid anónimo
src/routes/admin.js             /api/admin/* (requireAuth + requireAdmin en todos)
src/routes/auth.js              /api/auth/*
src/routes/catalog.js           /api/catalog (público)
src/routes/orders.js            /api/orders (requireAuth)
src/routes/reservations.js      /api/reservations (público con rate limit)
src/routes/users.js             /api/users/me (requireAuth, RGPD delete)
src/controllers/adminController.js
src/controllers/authController.js
src/controllers/catalogController.js
src/controllers/orderController.js
src/controllers/reservationController.js
src/services/authService.js     register, login (lock temporal), getMe, deleteAccount
src/services/catalogService.js
src/services/orderService.js    createOrder: recálculo total, blacklist, antifraude, idempotencia
src/services/reservationService.js
src/utils/httpError.js
src/utils/jwt.js                signToken, setAuthCookie (httpOnly), clearAuthCookie
src/validators/admin.js
src/validators/auth.js
src/validators/orders.js
src/validators/reservations.js
src/index.js                    Punto de entrada Express
.env.example                    Variables documentadas (nunca .env real)
.gitignore
package.json                    scripts: dev, start, prisma:*
README.md                       Setup rapido
```

#### Contratos de API implementados

| Método | Ruta | Auth requerida | Body (request) | Respuesta |
|--------|------|----------------|----------------|-----------|
| POST | `/api/auth/register` | — | `{ name, apellidos, email, password, phone, consentConditions, consentPrivacy, consentMarketing? }` | `201 { user }` + cookie httpOnly |
| POST | `/api/auth/login` | — | `{ email, password }` | `200 { user }` + cookie httpOnly |
| POST | `/api/auth/logout` | — | — | `200` + clear cookie |
| GET | `/api/auth/me` | JWT cookie | — | `200 { user }` |
| DELETE | `/api/users/me` | JWT cookie | — | `200` (RGPD soft-delete + anonimización) |
| GET | `/api/catalog` | — | — | `200 [{ id(=slug), slug, label, heading, products[{ id, name, description, price, allergens[], options? }] }]` |
| POST | `/api/orders` | JWT cookie | `{ idempotencyKey(uuid), mode, paymentMethod, timing, contactPhone, items[{ productId, quantity, selectedOptions?, removedIngredients?, notes? }], address?, notes? }` | `201 { orderId, status, total, confirmationTitle?, confirmationMessage? }` |
| POST | `/api/reservations` | — | `{ date, time, zone, guests }` | `200 { availableSlots[] }` |
| GET | `/api/admin/orders` | ADMIN | query: `?status=&page=&limit=` | `200 { data[], pagination }` |
| PATCH | `/api/admin/orders/:id` | ADMIN | `{ status, note? }` | `200 { order }` + fila en OrderStatusHistory |
| GET | `/api/admin/catalog` | ADMIN | — | Categorías + productos (incluye no disponibles) |
| POST | `/api/admin/catalog/products` | ADMIN | `{ categoryId, name, description?, price, available?, allergenIds? }` | `201 { product }` |
| PATCH | `/api/admin/catalog/products/:id` | ADMIN | campos parciales | `200 { product }` |
| DELETE | `/api/admin/catalog/products/:id` | ADMIN | — | `204` |
| GET | `/api/admin/users` | ADMIN | query: `?page=&limit=` | `200 { data[], pagination }` (solo CUSTOMER, excluye deleted) |
| GET | `/api/admin/users/:id/addresses` | ADMIN | — | `200 { addresses[] }` |
| GET | `/api/admin/blacklist` | ADMIN | — | `200 { data[] }` |
| POST | `/api/admin/blacklist` | ADMIN | `{ type, value, reason, expiresAt? }` | `201 { entry }` (expiry default 1 año) |
| DELETE | `/api/admin/blacklist/:id` | ADMIN | — | `204` |

#### Decisiones de arquitectura

- **Auth**: JWT en cookie httpOnly `lcn_token` (SameSite=Lax, Secure en prod). Payload mínimo: solo `sub = userId`. El rol se lee siempre de BD en cada request — el token nunca transporta el rol.
- **Rol ADMIN**: la guarda de `/api/admin/*` es `requireAdmin` que comprueba `req.user.role === 'ADMIN'`. El usuario se resuelve desde BD en `requireAuth`. El email no es el criterio; el criterio es la columna `role` en BD. Solo el seed puede crear un ADMIN.
- **Estado del pedido**: todos nacen en `PENDING`. No hay auto-confirmación (eliminada por decisión del usuario, 2026-06-14). El admin confirma manualmente desde el backoffice (`PATCH /api/admin/orders/:id`). Cada cambio de estado escribe una fila en `OrderStatusHistory`.
- **Recálculo de total**: `orderService.createOrder` calcula el total en servidor (precio de BD × cantidad + priceDelta de opciones). El campo `total` que el cliente pudiera enviar es ignorado.
- **Idempotencia**: `idempotencyKey` (UUID v4) en el body de `POST /api/orders`. Si ya existe un pedido con ese key en las últimas 24h, se devuelve el existente con HTTP 200.
- **Blacklist**: modelo `Blacklist` (tabla `blacklist`) consultado antes de crear el pedido. Tipos: `phone|address|email|ip`. Expiry máximo 1 año (RGPD).
- **RGPD soft-delete**: `DELETE /api/users/me` sobrescribe email/firstName/lastName/phone con valores anónimos y fija `deletedAt`.

#### Variables de entorno necesarias

```
DATABASE_URL               # PostgreSQL connection string
PORT                       # (default 3001)
NODE_ENV                   # development | production
JWT_SECRET                 # 64 bytes hex aleatorios
JWT_EXPIRES_IN             # (default "15m")
JWT_REFRESH_SECRET         # 64 bytes hex (para refresh tokens, futuro)
CORS_ORIGINS               # separados por coma
ADMIN_INITIAL_PASSWORD     # para el seed (min 12 chars)
TURNSTILE_ENABLED          # false en dev
TURNSTILE_SECRET_KEY       # Cloudflare Turnstile (si enabled)
```

#### Deuda / pendiente

- Turnstile: middleware planificado; validación real contra API Cloudflare no conectada aún.
- OTP de teléfono: `phoneVerified` en User listo; tabla `PhoneOtp` como deuda futura (sin proveedor SMS).
- Refresh tokens: tabla `RefreshToken` en schema lista; rotación no implementada en esta iteración.
- `POST /api/jobs` (candidaturas): endpoint no implementado.

- **Impacto para otros agentes**:
  - `frontend-react`: (1) Retirar campo `total` del body de `POST /api/orders`. (2) Añadir `idempotencyKey` (uuid v4) al body. (3) Añadir `contactPhone` al body. (4) Los fetch de auth deben usar `credentials: 'include'` — el JWT viaja en cookie, no en header. (5) `VITE_API_URL=http://localhost:3001` en `frontend/.env.local`. (6) Descomentar el bloque fetch en `catalogService.js`.
  - `security-expert`: revisar antes del primer despliegue: Turnstile real, refresh token rotation, OTP SMS.
  - `testing-expert`: tests con Jest + Supertest necesarios para: auth flows, order creation (total recalculado, idempotencia, blacklist), admin endpoints (bloqueo a no-admins), RGPD delete.

- **Acción requerida**:
  - `frontend-react`: actualizar `catalogService.js` y formularios de pedido/auth para la API real.
  - `testing-expert`: escribir tests de integración.
  - Setup de BD local (ver `backend/README.md`): crear BD, habilitar extensiones, ejecutar `npm run prisma:migrate`, `npm run prisma:seed`.

### [2026-06-14] backend-node — Diseno de BD APROBADO + schema.prisma generado

- **Qué cambió**:
  - `docs/database/schema.md` actualizado: estado cambiado a APROBADO, diagrama ERD y DBML actualizados con las tres entidades nuevas (`RefreshToken`, `OrderStatusHistory`, `JobApplication` definitiva), seccion "Decisiones abiertas" reemplazada por "Decisiones finales aprobadas (2026-06-14)", logica de autoconfirmacion eliminada (umbrales 40/50 EUR), tabla `Config` NO incluida, tabla `PhoneOtp` NO incluida (anotada como deuda futura).
  - `backend/prisma/schema.prisma` generado (sustituye borrador previo que usaba cuid y modelos distintos). Schema completo con:
    - `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`
    - `generator client { provider = "prisma-client-js"; previewFeatures = ["postgresqlExtensions"] }`
    - Declaracion de extensiones: `pgcrypto` (gen_random_uuid), `citext` (email case-insensitive)
    - Modelos en PascalCase, tablas en snake_case via `@@map`, columnas via `@map`
    - PKs UUID con `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`
    - Precios con `@db.Decimal(10, 2)`
    - `email @db.Citext` en User
    - `removedIngredients String[]` (array nativo PostgreSQL) en OrderLine
    - `selectedOptions Json?` en OrderLine
    - `@updatedAt` en todos los modelos que lo necesitan
    - Indices `@@index` y `@@unique` en todos los campos de busqueda frecuente
  - `backend/.env.example` actualizado: separados `JWT_SECRET`/`JWT_EXPIRES_IN` (access token, 15m) de `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN` (refresh token, 30d).

- **Entidades en el schema final**:
  | Tabla | Descripcion |
  |-------|-------------|
  | `users` | Usuarios. citext email, soft-delete RGPD, phone_verified preparado para OTP futuro. |
  | `refresh_tokens` | Sesiones persistentes con revocacion. token_hash SHA-256; nunca token en claro. |
  | `categories` | Categorias del catalogo (slug, label, heading, sort_order). |
  | `products` | Productos. Precio autoritativo. available para ocultar sin borrar. |
  | `allergens` | 14 alergenos UE de declaracion obligatoria. |
  | `product_allergens` | Union N:M Product-Allergen. PK compuesta. |
  | `option_groups` | Grupos de opciones por producto (ej: "Elige tu salsa"). |
  | `option_choices` | Opciones concretas con price_delta. |
  | `ingredients` | Ingredientes removibles por el cliente. |
  | `orders` | Pedidos. Todos nacen en PENDING. Confirmacion manual del admin. idempotency_key UNIQUE. Total recalculado en servidor. |
  | `order_lines` | Lineas del pedido. Snapshots inmutables (nombre + precio en el momento de compra). Referencia blanda a Product. |
  | `order_status_history` | Historial de transiciones de estado. changed_by nullable (sistema vs admin). |
  | `blacklist` | Lista negra anti-fraude. expires_at para purga RGPD (max 1 anyo). |
  | `job_applications` | Candidaturas de empleo. Independiente de User. CV en servidor. |

- **Enums**: `Role` (CUSTOMER/ADMIN), `OrderStatus` (PENDING/CONFIRMED/PREPARING/READY/OUT_FOR_DELIVERY/DELIVERED/CANCELLED), `OrderMode` (PICKUP/DELIVERY), `OrderTiming` (ASAP/SCHEDULED), `PaymentMethod` (CARD/CASH), `BlacklistType` (phone/address/email/ip).

- **Lo que NO se incluyo (decisiones del usuario)**:
  - `PhoneOtp`: sin proveedor SMS por ahora. Deuda futura. `phone_verified` en User queda como preparacion.
  - `Config`: sin parametros configurables desde backoffice en MVP. Umbrales de confirmacion eliminados (todos los pedidos son manuales).
  - Confirmacion automatica: eliminada. TODO pedido nace en PENDING y el admin decide.

- **Por qué**: El usuario aprobo el diseno ERD y confirmo las 6 decisiones abiertas.

- **Estado del backend**: SOLO el schema.prisma ha sido generado. El backend sigue sin andamiar (sin `package.json`, sin rutas, sin controladores). `npx prisma migrate dev` aun no se ha ejecutado.

- **Impacto para otros agentes**:
  - `frontend-react`: sin cambios. Los contratos de API siguen pendientes de implementacion.
  - `security-expert`: el schema incorpora los requisitos anti-fraude (idempotency_key, blacklist, soft-delete RGPD, refresh tokens con revocacion). Revisar cuando se implementen los endpoints.
  - `testing-expert`: cuando se andamie el backend, necesitara tests de: creacion de Order (status=PENDING), consulta a Blacklist antes de procesar, insercion en OrderStatusHistory en cada transicion, y revocacion de RefreshToken.

- **Acción requerida**:
  - Proximos pasos recomendados (en este orden, sin ejecutar aun):
    1. `npm init` o instalar dependencias en `backend/` (express, prisma, @prisma/client, etc).
    2. `CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS citext;` en la BD.
    3. `npx prisma migrate dev --name init` para crear las tablas.
    4. Seed del catalogo desde `frontend/src/data/catalogMockData.js` via `backend/prisma/seed.js`.
    5. Implementar endpoints: `GET /api/catalog`, `POST /api/orders`, `POST /api/reservations`, `POST /api/auth/login`, `POST /api/auth/register`.

### [2026-06-14] backend-node — PROPUESTA de modelo de datos (ERD) pendiente de aprobacion

- **Qué cambió**: Creado `docs/database/schema.md` con el diseño completo del modelo de datos para PostgreSQL + Prisma. Incluye: diagrama ERD (Mermaid), DBML para dbdiagram.io, descripcion por entidad y campo, enums, decisiones de diseño aplicadas y 6 decisiones abiertas que el usuario debe confirmar antes de generar `schema.prisma`.
- **Estado**: PROPUESTA. NO se ha generado `schema.prisma` ni ningun codigo. Solo documentacion para revision y aprobacion.
- **Entidades diseñadas**: `User`, `Category`, `Product`, `Allergen`, `ProductAllergen`, `OptionGroup`, `OptionChoice`, `Ingredient`, `Order`, `OrderLine`, `Blacklist`, `JobApplication` (opcional).
- **Enums**: `Role` (CUSTOMER/ADMIN), `OrderStatus` (PENDING/CONFIRMED/PREPARING/READY/OUT_FOR_DELIVERY/DELIVERED/CANCELLED), `OrderMode` (PICKUP/DELIVERY), `OrderTiming` (ASAP/SCHEDULED), `PaymentMethod` (CARD/CASH), `BlacklistType` (phone/address/email/ip).
- **Por qué**: Petición explícita del usuario para visualizar y aprobar el esquema antes de implementarlo.
- **Impacto para otros agentes**:
  - `frontend-react`: el contrato de `GET /api/catalog` confirma la forma `{ id, slug, label, heading, products[{ id, name, description, price, allergens[], options[], ingredients[] }] }`. Compatible con `catalogMockData.js` actual.
  - `security-expert`: el esquema incorpora todos los requisitos anti-fraude: `idempotency_key` en `Order`, `phone_verified` en `User`, `Blacklist` con `expires_at`, soft delete RGPD en `User`, snapshots inmutables en `OrderLine`.
  - `testing-expert`: cuando se apruebe y genere `schema.prisma`, necesitara tests de la logica de confirmacion automatica vs manual de pedidos y de la consulta a `Blacklist`.
- **Decisiones abiertas que el usuario debe confirmar** (en `schema.md` seccion 6):
  1. Umbral de confirmacion automatica (40 EUR / 50 EUR / configurable).
  2. Tabla `Config` para parametros del backoffice.
  3. `JobApplication` en el MVP o en iteracion 2.
  4. OTP en PostgreSQL (tabla `PhoneOtp`) o en Redis/memoria.
  5. Historial de estados del pedido (`OrderStatusHistory`) o solo estado actual.
  6. Refresh tokens en BD o JWT stateless.
- **Acción requerida**: El usuario debe revisar `docs/database/schema.md`, confirmar las 6 decisiones abiertas y dar la aprobacion para generar `schema.prisma`.

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
