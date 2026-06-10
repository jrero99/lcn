# CLAUDE.md — La Casa Nostra (LCN)

> Contexto principal del proyecto. Este archivo se carga en cada sesión.
> Mantenlo conciso y actualizado. Los detalles vivos de cambios entre agentes
> viven en [.claude/AGENT_LOG.md](.claude/AGENT_LOG.md).

## 0. Protocolo de despacho (DISPATCHER) — léelo primero

**En CADA prompt del usuario, antes de actuar, analiza la petición y decide qué
agente(s) debe(n) trabajar.** El hilo principal actúa como despachador:

1. **Clasifica** la petición por dominio (ver tabla de la sección 6).
2. **Anuncia** brevemente qué agente entra y por qué (1 línea).
3. **Delega** en ese agente. Si la tarea cruza dominios, encadena agentes en el
   orden lógico (p.ej. back define contrato → front integra → testing prueba →
   security/QA revisan).
4. Tras un cambio relevante, invoca a `knowledge-coordinator` para consolidar.

**Reglas de enrutado rápidas:**
- UI, React, componentes, páginas, estilos, mock data en cliente → `frontend-react`
- API, endpoints, BD, Prisma, lógica de negocio → `backend-node`
- Auth, validación, secretos, RGPD, vulnerabilidades, "¿es seguro?" → `security-expert`
- Tests automáticos, cobertura, "¿esto rompe algo?" → `testing-expert`
- Criterios de aceptación, casos de uso, validación funcional/UX → `qa-expert`
- "¿en qué estado está?", "¿qué ha cambiado?", sincronizar equipo → `knowledge-coordinator`

Si la petición es ambigua, pregunta antes de delegar. Si es trivial
(conversacional o una aclaración), respóndela directamente sin agente.

## 1. Qué es el proyecto

Página web para una **bocadillería en Mataró (Barcelona)**. La web permite a los
clientes:

- **Reservar mesa** (fecha, hora, número de comensales).
- **Hacer pedidos online** (carta de bocadillos, bebidas, extras) para recoger o entrega.
- **Login / registro de usuarios** (cuenta de cliente, historial de pedidos, datos guardados).
- Consultar la **carta**, horarios y ubicación.

Idioma de la interfaz: **catalán/castellano** (público local de Mataró). El código,
nombres de variables y commits van en **inglés**. La comunicación con el usuario
de este repositorio es en **castellano**.

## 2. Stack técnico

| Capa        | Tecnología                                              |
|-------------|---------------------------------------------------------|
| Frontend    | **React** (SPA), React Router, fetch/axios a la API     |
| Backend     | **Node.js** + Express (API REST)                         |
| Base datos  | **PostgreSQL + Prisma (ORM)**                           |
| Auth        | JWT + hashing de contraseñas (bcrypt/argon2)            |
| Pagos       | **Sin pasarela online.** Pago contra reembolso: tarjeta o efectivo al repartidor en la entrega |
| Hosting     | Desarrollo local + **frontend desplegado en GitHub Pages** vía GitHub Actions: https://jrero99.github.io/lcn/. El backend aún no se despliega (sigue local). |
| Tests       | Frontend: Vitest + React Testing Library. Backend: Jest + Supertest |

> **Decisiones confirmadas (2026-06-09):** BD = PostgreSQL + Prisma · Pago = al
> repartidor (tarjeta/efectivo), sin pasarela online · Hosting = frontend en
> GitHub Pages (https://jrero99.github.io/lcn/) vía GitHub Actions; backend sin
> despliegue por ahora.
> No introduzcas integraciones de pago (Stripe, etc.). El deploy de GitHub Pages
> está adoptado; no añadas otros despliegues (backend, cloud, VPS, etc.) sin que
> el usuario lo pida explícitamente.

## 3. Estructura de carpetas (objetivo)

```
lcn/
├── CLAUDE.md
├── .claude/
│   ├── agents/            # Definiciones de los agentes especializados
│   └── AGENT_LOG.md       # Registro vivo de cambios entre agentes
├── frontend/              # App React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/      # Llamadas a la API
│   │   └── ...
│   └── package.json
└── backend/               # API Node/Express
    ├── src/
    │   ├── routes/
    │   ├── controllers/
    │   ├── services/
    │   ├── models/
    │   ├── middleware/
    │   └── ...
    └── package.json
```

## 4. Dominios funcionales clave

- **Auth**: registro, login, logout, recuperación de contraseña, sesiones (JWT).
- **Reservas**: disponibilidad por franjas horarias, aforo, confirmación.
- **Pedidos**: carrito, carta/productos, estados del pedido. **Pago al recibir** (tarjeta o efectivo al repartidor); el cliente elige método al confirmar, sin cobro online.
- **Catálogo**: bocadillos, ingredientes, alérgenos, precios, disponibilidad.
- **Cuenta de usuario**: perfil, historial de pedidos y reservas.

## 4.b Identidad de marca

- **Color principal (rojo):** `#7A020E`. Definido como `--brand` en
  `frontend/src/index.css`. Úsalo siempre vía la variable, no hardcodeado.
- **Tipografías:** títulos en familia **Salo** (`--font-heading`), texto en
  **Roboto** (`--font-body`). Roboto se carga desde Google Fonts; **Salo** debe
  auto-alojarse en `frontend/src/assets/fonts/` (hay un `@font-face` comentado
  listo en `index.css`).

## 5. Reglas transversales

- **Seguridad primero**: nunca loguear secretos ni datos personales; validar y
  sanear toda entrada; las contraseñas siempre hasheadas; usar variables de
  entorno para secretos (`.env`, nunca commiteado).
- **Alérgenos**: la carta debe poder reflejar alérgenos (requisito legal en hostelería UE).
- **RGPD**: datos personales mínimos, consentimiento y posibilidad de borrado.
- **Accesibilidad** y **responsive**: la mayoría de clientes entran desde móvil.
- Commits en inglés, mensajes claros. Rama por feature.

## 6. Equipo de agentes

Este proyecto usa agentes especializados (en [.claude/agents/](.claude/agents/)).
Cada uno tiene su dominio. Delega en el agente correcto:

| Agente                  | Dominio                                                |
|-------------------------|--------------------------------------------------------|
| `frontend-react`        | UI React, componentes, estado, llamadas a la API       |
| `backend-node`          | API Node/Express, BD, lógica de negocio                |
| `security-expert`       | Auth, validación, RGPD, vulnerabilidades               |
| `testing-expert`        | Tests unitarios e integración (front y back)           |
| `qa-expert`             | QA funcional, casos de uso, criterios de aceptación    |
| `knowledge-coordinator` | Sincroniza y "entrena" al resto registrando los cambios|

**Flujo de coordinación**: cuando cualquier agente hace un cambio relevante
(nuevo endpoint, cambio de contrato de API, nueva dependencia, decisión de
arquitectura), debe anotarlo en [.claude/AGENT_LOG.md](.claude/AGENT_LOG.md).
El `knowledge-coordinator` lee ese registro y mantiene al resto al día.

## 7. Estado actual

**Frontend React: en curso.** Páginas implementadas y construidas:
- `Home` (landing): hero, "Sobre nosotros", carta (polaroids), marquee, local (foto real `local.png`), empleo.
- Flujo de pedido completo: `HacerPedido` → `PedidoDatos` → `OrderCatalog` (13 categorías, mock data, alérgenos, `ProductModal` ficha de producto) → `OrderConfirmation` (abre `Modal` genérico con resumen + nota pago al recibir).
- Página `Reservas` (paso 1): formulario fecha/hora/zona/personas; datos mock; punto de integración con `POST /api/reservations` marcado con TODO.
- Componente `Modal` genérico reutilizable (`frontend/src/components/Modal.jsx`): props `isOpen`, `onClose`, `title`, `message`, `children`. Preparado para recibir `confirmationTitle`/`confirmationMessage` desde `POST /api/orders` como props opt-in (con defaults si ausentes). **Todos los diálogos/confirmaciones futuros deben reusar este componente.**
- Diseño responsive completado: breakpoints 860px / 520px / 400px; menú hamburguesa accesible; targets táctiles 44px; sin overflow a 360px.
- Deploy: GitHub Pages https://jrero99.github.io/lcn/ vía `.github/workflows/deploy.yml`. Vite `base: '/lcn/'` en CI; React Router con `basename`. `dist/404.html` como fallback SPA.

**Pendiente de construir:**
- Páginas Login / Registro (enlace header apunta a `#` con TODO).
- Imágenes reales: hero y polaroids de la carta (3 fotos). La foto del local ya está integrada (`local.png`; pendiente optimización a `.webp`, ~1 MB).
- Fuente Salo auto-alojada en `frontend/src/assets/fonts/` (`@font-face` comentado en `index.css`).

**Backend Node/Express + Prisma:** aún sin andamiar. Catálogo y carrito usan mock data en cliente. Contratos pendientes: `GET /api/catalog` (debe incluir campo `options[]`), `POST /api/orders` (puede devolver `confirmationTitle?`/`confirmationMessage?` opcionales para el Modal), `POST /api/reservations`. Ver tabla completa en `.claude/AGENT_LOG.md` sección "Estado consolidado".
