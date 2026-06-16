# Plan de testing — LCN (setup + tests críticos)

> Estado: **PLANIFICADO, sin ejecutar.** Acordado el 2026-06-16.
> Alcance elegido: configurar el entorno de tests (front y back) + cubrir lo más
> sensible primero (auth, reservas y recálculo de total / anti-fraude del backend).
> Ejecutor previsto: agente `testing-expert`. Stack según CLAUDE.md §2:
> Frontend = Vitest + React Testing Library · Backend = Jest + Supertest.

---

## 0. Por qué este plan

Hoy **no existe ningún test** ni infraestructura de testing:
- `frontend/package.json`: sin `vitest`, sin `@testing-library`, sin script `test`.
- `backend/package.json`: sin `jest`, sin `supertest`, sin script `test`.

Hay deuda acumulada porque las peticiones previas fueron de construcción de
features y el paso "testing prueba" del flujo de CLAUDE.md no se cerró. Este plan
arranca por la infraestructura y por los puntos de mayor riesgo de negocio.

---

## 1. Setup de infraestructura

### 1.1 Backend (Jest + Supertest)
- **Dependencias dev:** `jest`, `supertest`, `cross-env`. (ESM: el proyecto usa
  `import`/`export`, así que configurar Jest para ESM —
  `node --experimental-vm-modules` en el script, o `babel-jest` con preset.)
- **Script:** `"test": "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest"`.
- **Config:** `backend/jest.config.js` → `testEnvironment: 'node'`,
  `testMatch` en `**/*.test.js`, `setupFiles` para variables de entorno de test
  (`JWT_SECRET=test-secret`, etc. — recordar que `config/env.js` lanza si falta `JWT_SECRET`).
- **Estrategia de BD/Prisma:** los servicios importan `prisma` de
  `config/prisma.js`. Para tests **unitarios** se mockea Prisma (`jest.mock` del
  cliente) y no se toca PostgreSQL. Tests de integración con BD real quedan FUERA
  de este alcance inicial (requieren BD de test dedicada — anotarlo como fase 2).
- **Carpeta:** colocar tests junto al código (`*.test.js`) o en `backend/tests/`.
  Decisión recomendada: `backend/src/**/__tests__/` para unit, `backend/tests/` para integración futura.

### 1.2 Frontend (Vitest + React Testing Library)
- **Dependencias dev:** `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`, `jsdom`.
- **Scripts:** `"test": "vitest run"`, `"test:watch": "vitest"`.
- **Config:** `frontend/vite.config.js` → bloque `test` con
  `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/test/setup.js'`.
- **Setup file:** importar `@testing-library/jest-dom`; helper para envolver
  componentes en `MemoryRouter` + `AuthProvider` cuando haga falta.
- **Mock de red:** mockear la capa `src/services/*` (no `fetch` directo) porque los
  componentes consumen servicios (`authService`, `catalogService`, etc.).

---

## 2. Tests críticos del backend (prioridad alta)

### 2.1 `services/orderService.js` — recálculo de total y anti-fraude ★ máxima prioridad
Es el núcleo anti-fraude NO negociable (CLAUDE.md §5). Mockear Prisma y cubrir:
- **Recálculo de total server-side**: el total se calcula desde `product.price`
  de BD + `priceDelta` de opciones, **ignorando** cualquier total que mande el cliente.
- **Producto inexistente** → 422.
- **Producto no disponible** (`available: false`) → 422.
- **priceDelta de opciones**: suma correcta de `selectedOptions` (varias choices).
- **Idempotencia**: misma `idempotencyKey` en <24h → devuelve pedido existente
  (`alreadyExisted: true`) sin crear otro.
- **Blacklist**: match por phone/address/email no expirado → 403.
- **Cuenta inexistente o `deletedAt`** → 403.
- **Anti-fraude `detectFraudFlags`** (vía `createOrder` o exportando la función):
  - `RAPID_REPEAT_SAME_ADDRESS` (≥2 pedidos mismo phone+address en 5 min).
  - `PHONE_EXCEEDS_DAILY_LIMIT` (≥2 pedidos mismo phone en 24h).
  - `MULTIPLE_PHONES_SAME_ADDRESS` (≥3 phones distintos misma address en 1h).
- **Estado inicial siempre `PENDING`** + se escribe `orderStatusHistory`.
- **DELIVERY sin `addressId`** → 400.

### 2.2 `services/reservationService.js` — horarios y fechas
Función pura `checkReservationAvailability` (no toca BD → fácil de testear):
- **Fecha/hora pasada** → 422.
- **Fuera de horario de apertura** → 422 (usar fechas conocidas contra `OPENING_HOURS`).
- **Dentro de horario** → `{ availableSlots: [] }`.
- **Manejo de timezone Europe/Madrid** (CET vs CEST): verificar que una hora límite
  se evalúa correctamente. ⚠️ Estos tests dependen de la TZ del runner — fijar
  `TZ=Europe/Madrid` en el entorno de test o documentar la dependencia.

### 2.3 `services/authService.js` — `normalizePhone` (función pura)
- Normaliza números españoles válidos (con/sin prefijo, espacios).
- Rechaza números inválidos (longitud/prefijo incorrecto).

### 2.4 `validators/auth.js` — esquemas Zod
- `registerSchema`: email normalizado a minúsculas, consentimientos obligatorios
  (`consentConditions`/`consentPrivacy` deben ser `true`), honeypot `_honey` vacío.
- `loginSchema`: validación de email/password.
- Teléfono español (`spanishPhone` superRefine): acepta válidos, rechaza inválidos.

### 2.5 Integración HTTP (Supertest) — humo de rutas clave
Levantar la app Express (extraer `app` de `index.js` si aún no se exporta) y probar
sin BD real (mock de servicios) o marcar como fase 2 si requiere BD:
- `POST /api/auth/login` con credenciales inválidas → 401.
- `POST /api/reservations` fuera de horario → 422.
- Rutas protegidas sin JWT → 401 (middleware `auth.js`).
- Rate limiter: superar el límite → 429 (si es testeable sin esperar ventanas reales).

---

## 3. Tests críticos del frontend (prioridad alta)

### 3.1 `context/AuthContext.jsx`
- `login()` actualiza `user` e `isAuthenticated`.
- `logout()` limpia estado.
- Evento `onUnauthorized` (sessionEvents) fuerza logout.

### 3.2 Página `Reservas.jsx`
- Render del formulario (fecha/hora/zona/personas).
- Validación cliente: no permite enviar campos vacíos / fecha pasada.
- Envío llama al servicio correcto y muestra confirmación vía `Modal`.

### 3.3 Flujo de login/registro (`Login.jsx`, `Registro.jsx`)
- Registro: consentimientos obligatorios bloquean el submit si no están marcados.
- Login: error de credenciales muestra mensaje, éxito redirige.
- `GoogleSignInButton`: render condicional según disponibilidad (no romper si no hay client ID).

### 3.4 `components/Modal.jsx` (genérico reutilizable)
- No renderiza si `isOpen` es false.
- Renderiza `title`/`message`/`children`; `onClose` se dispara al cerrar.
- Accesibilidad básica (rol de diálogo, foco).

### 3.5 `components/ProtectedRoute.jsx`
- Usuario no autenticado → redirige a login.
- Autenticado → renderiza el hijo.

---

## 4. Orden de ejecución recomendado

1. **Setup backend** (Jest+Supertest+config) → 1 test de humo que pase.
2. **Setup frontend** (Vitest+RTL+config) → 1 test de humo que pase.
3. **Backend críticos**: `orderService` (§2.1) → `reservationService` (§2.2) →
   `normalizePhone` + validators (§2.3, §2.4).
4. **Frontend críticos**: `AuthContext` → `Modal`/`ProtectedRoute` → `Reservas` →
   login/registro.
5. **Integración HTTP** (§2.5) — solo si se resuelve la estrategia de BD/mock.
6. (Fase 2, fuera de alcance) Tests de integración con BD de test real, cobertura
   de páginas restantes, CI que ejecute `npm test` en front y back.

---

## 5. Decisiones pendientes antes de ejecutar

- **Jest ESM vs Babel**: elegir `--experimental-vm-modules` (sin Babel) o `babel-jest`.
  Recomendado: experimental-vm-modules para no añadir Babel al backend.
- **Mock de Prisma vs BD de test**: este plan asume **mock** para unit tests.
  Confirmar si se quiere una BD de test (Postgres) para integración ya en esta fase.
- **Exportar `app` de `index.js`** para Supertest sin abrir el puerto.
- **CI**: ¿añadir un workflow que corra los tests en cada push? (no incluido en alcance inicial).

---

## 6. Definición de "hecho" para esta fase

- `npm test` funciona y pasa en `backend/` y en `frontend/`.
- `orderService` (recálculo de total + anti-fraude) cubierto y verde.
- `reservationService`, `normalizePhone` y validators de auth cubiertos.
- `AuthContext`, `Modal`, `ProtectedRoute` y `Reservas` con tests básicos verdes.
- Anotado en `.claude/AGENT_LOG.md` por `knowledge-coordinator`.
