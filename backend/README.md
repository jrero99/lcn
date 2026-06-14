# LCN Backend

API REST para La Casa Nostra — Node.js + Express + Prisma + PostgreSQL.

## Setup rapido

### 1. Requisitos previos

- Node.js >= 20
- PostgreSQL corriendo en local

### 2. Variables de entorno

```bash
cp .env.example .env
# Editar .env con los valores reales (DATABASE_URL, JWT_SECRET, ADMIN_INITIAL_PASSWORD)
```

### 3. Crear la base de datos y habilitar extensiones

```sql
createdb lcn
-- O desde psql:
psql -c "CREATE DATABASE lcn;"
psql -d lcn -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
psql -d lcn -c "CREATE EXTENSION IF NOT EXISTS \"citext\";"
```

### 4. Instalar dependencias

```bash
npm install
```

### 5. Generar el cliente Prisma y ejecutar la primera migración

```bash
npm run prisma:generate
npm run prisma:migrate
# Nombre sugerido para la primera migración: "init"
```

### 6. Seed del usuario admin

```bash
npm run prisma:seed
# Requiere ADMIN_INITIAL_PASSWORD en .env (min 12 caracteres)
# Crea lacasanostramataro@gmail.com como ADMIN
```

### 7. Arrancar en desarrollo

```bash
npm run dev
# Escucha en http://localhost:3001 (configurable via PORT en .env)
```

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor con hot-reload (`--watch`) |
| `npm start` | Servidor de producción |
| `npm run prisma:generate` | Genera el cliente Prisma |
| `npm run prisma:migrate` | Crea/aplica migraciones (dev) |
| `npm run prisma:migrate:prod` | Aplica migraciones en producción |
| `npm run prisma:studio` | Abre Prisma Studio en el navegador |
| `npm run prisma:seed` | Crea el usuario admin inicial |
| `npm run prisma:reset` | Borra y reinicia la BD (solo dev) |

## Estructura

```
backend/
├── prisma/
│   ├── schema.prisma    # Modelo de datos
│   └── seed.js          # Crea el usuario admin
├── src/
│   ├── config/          # Entorno (env.js) y cliente Prisma (prisma.js)
│   ├── controllers/     # Lógica de request/response por dominio
│   ├── middleware/       # auth, cors, errorHandler, rateLimiter, honeypot
│   ├── routes/          # Express routers
│   ├── services/        # Lógica de negocio (authService, orderService, etc.)
│   ├── utils/           # jwt.js, httpError.js
│   ├── validators/      # Schemas Zod por endpoint
│   └── index.js         # Punto de entrada
├── .env.example
├── .gitignore
└── package.json
```

## Endpoints principales

Ver `.claude/AGENT_LOG.md` para la tabla completa con request/response.

## Seguridad

- JWT en cookie httpOnly (SameSite=Lax, Secure en prod)
- Contraseñas hasheadas con argon2id (64 MiB, 3 iteraciones)
- Rate limiting por IP en todos los endpoints públicos
- Total del pedido recalculado siempre en servidor
- Rol ADMIN verificado desde BD en cada request (no desde el token)
- Validación estricta con Zod (422 + lista de errores si falla)
- Blacklist consultada antes de procesar cualquier pedido
