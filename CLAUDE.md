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
| Hosting     | **Solo local de momento** (desarrollo). Sin despliegue. |
| Tests       | Frontend: Vitest + React Testing Library. Backend: Jest + Supertest |

> **Decisiones confirmadas (2026-06-09):** BD = PostgreSQL + Prisma · Pago = al
> repartidor (tarjeta/efectivo), sin pasarela online · Hosting = solo local.
> No introduzcas integraciones de pago (Stripe, etc.) ni configuración de
> despliegue salvo que el usuario lo pida explícitamente.

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

🚧 **Proyecto recién iniciado**. Aún no hay código de aplicación, solo el
contexto y los agentes. Decisiones de stack ya confirmadas (sección 2).
Próximo paso: andamiar `frontend/` (React) y `backend/` (Node/Express + Prisma + PostgreSQL).
