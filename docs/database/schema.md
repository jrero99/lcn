# Modelo de datos — La Casa Nostra (LCN)

> Estado: **APROBADO por el usuario el 2026-06-14.**
> El archivo `backend/prisma/schema.prisma` ha sido generado.
> Autor: backend-node

---

## Decisiones finales aprobadas (2026-06-14)

El usuario revisó la propuesta y confirmó las siguientes decisiones antes de la generación del schema:

| # | Decision | Resultado |
|---|----------|-----------|
| 1 | **Confirmacion de pedidos** | TODOS los pedidos nacen en `status = PENDING`. El admin los pasa manualmente a `CONFIRMED` o `CANCELLED` desde el backoffice. NO hay autoconfirmacion automatica. Se elimina toda logica de umbrales (40/50 EUR) y NO se crea tabla `Config`. |
| 2 | **Historial de estados** | Se incluye `OrderStatusHistory`: tabla con `id, order_id, status, changed_by (FK nullable), changed_at, note (nullable)`. Registra cada transicion de estado para trazabilidad en el backoffice. |
| 3 | **Refresh tokens** | Se incluye `RefreshToken`: tabla con `id, user_id, token_hash, expires_at, revoked_at, created_at, user_agent, ip`. El token nunca se guarda en claro. Permite revocar sesiones. Access token sigue siendo JWT de corta duracion. |
| 4 | **JobApplication** | Pasa a tabla DEFINITIVA del MVP. El front ya tiene el formulario `POST /api/jobs`. Se incluye en el esquema desde el inicio. |
| 5 | **OTP por SMS** | NO se incluye tabla `PhoneOtp`. El usuario no quiere proveedor SMS por ahora. Anotado como deuda futura. El campo `phone_verified` permanece en `User` para uso futuro. |
| 6 | **Todo lo demas** | Se mantiene: User, Category, Product, Allergen, ProductAllergen, OptionGroup, OptionChoice, Ingredient, Order, OrderLine, Blacklist. Snapshots en OrderLine, soft-delete RGPD en User, `idempotency_key` en Order, `citext` en email, UUIDs como PK. |

**Deuda futura anotada:** tabla `PhoneOtp` para verificacion OTP por SMS (Twilio o AWS SNS) cuando se contrate el proveedor. El campo `phone_verified` en `User` ya esta preparado para recibirlo.

---

## 1. Diagrama ERD (Mermaid)

```mermaid
erDiagram

    %% ─────────────────────────────────────────────
    %% USUARIOS Y SESIONES
    %% ─────────────────────────────────────────────

    User {
        UUID        id                  PK
        CITEXT      email               UNIQUE "NOT NULL"
        TEXT        password_hash       "NOT NULL"
        TEXT        first_name          "NOT NULL"
        TEXT        last_name           "NOT NULL"
        TEXT        phone               "E.164, nullable"
        BOOLEAN     phone_verified      "default false"
        ROLE        role                "CUSTOMER | ADMIN, default CUSTOMER"
        BOOLEAN     accepted_terms      "NOT NULL"
        BOOLEAN     accepted_privacy    "NOT NULL"
        BOOLEAN     accepted_marketing  "default false"
        BOOLEAN     age_confirmed       "default false"
        TIMESTAMP   deleted_at          "nullable - soft delete RGPD"
        TIMESTAMP   created_at          "NOT NULL"
        TIMESTAMP   updated_at          "NOT NULL"
    }

    RefreshToken {
        UUID        id          PK
        UUID        user_id     FK
        TEXT        token_hash  "NOT NULL - nunca el token en claro"
        TIMESTAMP   expires_at  "NOT NULL"
        TIMESTAMP   revoked_at  "nullable - null = sesion activa"
        TIMESTAMP   created_at  "NOT NULL"
        TEXT        user_agent  "nullable"
        TEXT        ip          "nullable"
    }

    %% ─────────────────────────────────────────────
    %% CATALOGO
    %% ─────────────────────────────────────────────

    Category {
        UUID        id          PK
        TEXT        slug        UNIQUE "NOT NULL, URL-friendly"
        TEXT        label       "NOT NULL, nombre corto (tab nav)"
        TEXT        heading     "NOT NULL, heading grande de seccion"
        INT         sort_order  "NOT NULL, default 0"
        TIMESTAMP   created_at  "NOT NULL"
        TIMESTAMP   updated_at  "NOT NULL"
    }

    Product {
        UUID        id          PK
        UUID        category_id FK
        TEXT        name        "NOT NULL"
        TEXT        description "nullable"
        NUMERIC     price       "10,2 - NOT NULL, precio base"
        BOOLEAN     available   "NOT NULL, default true"
        INT         sort_order  "NOT NULL, default 0"
        TIMESTAMP   created_at  "NOT NULL"
        TIMESTAMP   updated_at  "NOT NULL"
    }

    Allergen {
        UUID        id      PK
        TEXT        name    UNIQUE "NOT NULL"
        TEXT        icon    "nullable"
    }

    ProductAllergen {
        UUID        product_id  FK
        UUID        allergen_id FK
    }

    OptionGroup {
        UUID        id          PK
        UUID        product_id  FK
        TEXT        label       "NOT NULL"
        TEXT        type        "NOT NULL, default: single"
        INT         sort_order  "NOT NULL, default 0"
    }

    OptionChoice {
        UUID        id              PK
        UUID        option_group_id FK
        TEXT        label           "NOT NULL"
        NUMERIC     price_delta     "10,2 - NOT NULL, default 0.00"
        INT         sort_order      "NOT NULL, default 0"
        BOOLEAN     available       "NOT NULL, default true"
    }

    Ingredient {
        UUID        id          PK
        UUID        product_id  FK
        TEXT        name        "NOT NULL"
        INT         sort_order  "NOT NULL, default 0"
    }

    %% ─────────────────────────────────────────────
    %% PEDIDOS
    %% ─────────────────────────────────────────────

    Order {
        UUID            id                  PK
        UUID            user_id             FK "NOT NULL"
        ORDER_STATUS    status              "NOT NULL, default PENDING"
        ORDER_MODE      mode                "NOT NULL: PICKUP | DELIVERY"
        TEXT            delivery_address    "nullable, solo delivery"
        ORDER_TIMING    timing              "NOT NULL: ASAP | SCHEDULED"
        TIMESTAMP       scheduled_for       "nullable"
        PAYMENT_METHOD  payment_method      "NOT NULL: CARD | CASH"
        NUMERIC         total               "10,2 - NOT NULL, calculado en servidor"
        TEXT            contact_phone       "NOT NULL, E.164"
        BOOLEAN         age_confirmed       "NOT NULL, default false"
        TEXT            idempotency_key     UNIQUE "NOT NULL, uuid v4"
        TEXT            notes               "nullable"
        TIMESTAMP       created_at          "NOT NULL"
        TIMESTAMP       updated_at          "NOT NULL"
    }

    OrderLine {
        UUID        id                      PK
        UUID        order_id                FK
        UUID        product_id              FK "nullable - referencia blanda"
        TEXT        product_name_snapshot   "NOT NULL, inmutable"
        NUMERIC     unit_price_snapshot     "10,2 - NOT NULL, inmutable"
        INT         quantity                "NOT NULL, >= 1"
        NUMERIC     line_total              "10,2 - NOT NULL"
        JSONB       selected_options        "nullable - snapshot historico"
        TEXT[]      removed_ingredients     "nullable"
        TEXT        notes                   "nullable"
    }

    OrderStatusHistory {
        UUID            id          PK
        UUID            order_id    FK
        ORDER_STATUS    status      "NOT NULL, nuevo estado"
        UUID            changed_by  FK "nullable - FK a User; null = sistema"
        TIMESTAMP       changed_at  "NOT NULL"
        TEXT            note        "nullable, razon del cambio"
    }

    %% ─────────────────────────────────────────────
    %% ANTI-FRAUDE
    %% ─────────────────────────────────────────────

    Blacklist {
        UUID        id          PK
        TEXT        type        "NOT NULL: phone | address | email | ip"
        TEXT        value       "NOT NULL"
        TEXT        reason      "nullable"
        TIMESTAMP   expires_at  "nullable, retencion max 1 anyo"
        TIMESTAMP   created_at  "NOT NULL"
    }

    %% ─────────────────────────────────────────────
    %% EMPLEO (MVP DEFINITIVO)
    %% ─────────────────────────────────────────────

    JobApplication {
        UUID        id               PK
        TEXT        name             "NOT NULL"
        TEXT        phone            "NOT NULL, E.164"
        TEXT        email            "NOT NULL"
        TEXT        message          "nullable"
        TEXT        cv_file_path     "nullable"
        TEXT        cv_original_name "nullable"
        BOOLEAN     rgpd_consent     "NOT NULL"
        TIMESTAMP   created_at       "NOT NULL"
    }

    %% ─────────────────────────────────────────────
    %% RELACIONES
    %% ─────────────────────────────────────────────

    User            ||--o{    RefreshToken         : "tiene"
    User            ||--o{    Order                : "realiza"
    User            |o--o{    OrderStatusHistory   : "cambia (nullable)"

    Category        ||--o{    Product              : "tiene"
    Product         ||--o{    ProductAllergen      : "tiene"
    Allergen        ||--o{    ProductAllergen      : "en"
    Product         ||--o{    OptionGroup          : "tiene"
    OptionGroup     ||--o{    OptionChoice         : "tiene"
    Product         ||--o{    Ingredient           : "tiene"

    Order           ||--o{    OrderLine            : "contiene"
    Order           ||--o{    OrderStatusHistory   : "historial"
    Product         |o--o{    OrderLine            : "referencia blanda"
```

---

## 2. DBML (para dbdiagram.io)

```dbml
// La Casa Nostra — LCN
// Base de datos: PostgreSQL + Prisma
// Estado: APROBADO — 2026-06-14

/////////////////////////////////////////////////////////////////////
// ENUMS
/////////////////////////////////////////////////////////////////////

enum Role {
  CUSTOMER
  ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
}

enum OrderMode {
  PICKUP
  DELIVERY
}

enum OrderTiming {
  ASAP
  SCHEDULED
}

enum PaymentMethod {
  CARD
  CASH
}

enum BlacklistType {
  phone
  address
  email
  ip
}

/////////////////////////////////////////////////////////////////////
// USUARIOS Y SESIONES
/////////////////////////////////////////////////////////////////////

Table users {
  id                  UUID        [pk, default: `gen_random_uuid()`]
  email               citext      [unique, not null, note: "Case-insensitive. Extension citext de PostgreSQL."]
  password_hash       text        [not null, note: "bcrypt cost>=12 o argon2id. NUNCA en texto plano."]
  first_name          text        [not null]
  last_name           text        [not null]
  phone               text        [null, note: "Normalizado a E.164 con libphonenumber-js. Solo telefonos validos en Espanya."]
  phone_verified      boolean     [not null, default: false, note: "true tras OTP exitoso. Campo preparado para uso futuro (OTP SMS pendiente de proveedor)."]
  role                Role        [not null, default: "CUSTOMER"]
  accepted_terms      boolean     [not null, note: "Consentimiento condiciones de venta. Obligatorio."]
  accepted_privacy    boolean     [not null, note: "Consentimiento politica de datos. Obligatorio (RGPD)."]
  accepted_marketing  boolean     [not null, default: false, note: "Comunicaciones comerciales. Opcional."]
  age_confirmed       boolean     [not null, default: false]
  deleted_at          timestamp   [null, note: "Soft delete RGPD. Si no nulo, cuenta anonimizada."]
  created_at          timestamp   [not null, default: `now()`]
  updated_at          timestamp   [not null, default: `now()`]

  indexes {
    email [unique]
    phone
    deleted_at
  }
}

Table refresh_tokens {
  id          UUID      [pk, default: `gen_random_uuid()`]
  user_id     UUID      [not null, ref: > users.id]
  token_hash  text      [not null, note: "SHA-256 del refresh token. NUNCA el token en claro."]
  expires_at  timestamp [not null]
  revoked_at  timestamp [null, note: "null = sesion activa. No nulo = revocada (logout o 'cerrar todas las sesiones')."]
  created_at  timestamp [not null, default: `now()`]
  user_agent  text      [null, note: "User-Agent del navegador/app al crear el token. Para mostrar sesiones activas."]
  ip          text      [null, note: "IP de origen al crear el token. Solo para auditoria; no loguear en ficheros de log."]

  indexes {
    user_id
    (user_id, revoked_at)
    expires_at
  }
}

/////////////////////////////////////////////////////////////////////
// CATALOGO
/////////////////////////////////////////////////////////////////////

Table categories {
  id          UUID      [pk, default: `gen_random_uuid()`]
  slug        text      [unique, not null, note: "URL-friendly: 'classics', 'burgers', etc."]
  label       text      [not null, note: "Nombre corto para la tab de navegacion: 'Clasicos', 'Tapas'..."]
  heading     text      [not null, note: "Heading grande de seccion: '!LOS CLASICOS QUE SI O SI...'"]
  sort_order  int       [not null, default: 0]
  created_at  timestamp [not null, default: `now()`]
  updated_at  timestamp [not null, default: `now()`]
}

Table products {
  id           UUID          [pk, default: `gen_random_uuid()`]
  category_id  UUID          [not null, ref: > categories.id]
  name         text          [not null]
  description  text          [null]
  price        decimal(10,2) [not null, note: "Precio base. El total real puede variar por price_delta de OptionChoice."]
  available    boolean       [not null, default: true]
  sort_order   int           [not null, default: 0]
  created_at   timestamp     [not null, default: `now()`]
  updated_at   timestamp     [not null, default: `now()`]

  indexes {
    category_id
    (available, sort_order)
  }
}

Table allergens {
  id    UUID  [pk, default: `gen_random_uuid()`]
  name  text  [unique, not null, note: "Nombre normalizado: 'gluten', 'lacteos', 'huevos', etc. 14 alergenos UE."]
  icon  text  [null, note: "Emoji o nombre de icono para la UI."]
}

Table product_allergens {
  product_id   UUID [not null, ref: > products.id]
  allergen_id  UUID [not null, ref: > allergens.id]

  indexes {
    (product_id, allergen_id) [pk]
  }
}

Table option_groups {
  id          UUID  [pk, default: `gen_random_uuid()`]
  product_id  UUID  [not null, ref: > products.id]
  label       text  [not null, note: "Heading del grupo: 'Elige tu acompanyante', 'Elige tu salsa'"]
  type        text  [not null, default: "single", note: "Solo 'single' (radio) soportado ahora. Extensible a 'multi' futuro."]
  sort_order  int   [not null, default: 0]
}

Table option_choices {
  id              UUID          [pk, default: `gen_random_uuid()`]
  option_group_id UUID          [not null, ref: > option_groups.id]
  label           text          [not null]
  price_delta     decimal(10,2) [not null, default: 0.00]
  sort_order      int           [not null, default: 0]
  available       boolean       [not null, default: true]
}

Table ingredients {
  id          UUID  [pk, default: `gen_random_uuid()`]
  product_id  UUID  [not null, ref: > products.id]
  name        text  [not null, note: "Ingrediente removible: 'Queso cheddar', 'Jalapenos'..."]
  sort_order  int   [not null, default: 0]
}

/////////////////////////////////////////////////////////////////////
// PEDIDOS
/////////////////////////////////////////////////////////////////////

Table orders {
  id                UUID          [pk, default: `gen_random_uuid()`]
  user_id           UUID          [not null, ref: > users.id, note: "Solo pedidos de usuarios registrados. NO hay pedido de invitado."]
  status            OrderStatus   [not null, default: "PENDING", note: "Todos los pedidos nacen en PENDING. El admin los confirma o cancela manualmente."]
  mode              OrderMode     [not null]
  delivery_address  text          [null, note: "Solo si mode=DELIVERY. Debe incluir 'Mataro' o CP 08301-08304."]
  timing            OrderTiming   [not null]
  scheduled_for     timestamp     [null, note: "Solo si timing=SCHEDULED."]
  payment_method    PaymentMethod [not null, note: "CARD o CASH. Pago al recibir, sin cobro online."]
  total             decimal(10,2) [not null, note: "Recalculado siempre en servidor. NUNCA se acepta el total del cliente."]
  contact_phone     text          [not null, note: "Telefono de contacto para el pedido. E.164."]
  age_confirmed     boolean       [not null, default: false]
  idempotency_key   text          [unique, not null, note: "UUID v4 enviado por el cliente. Previene pedidos duplicados en 24h."]
  notes             text          [null]
  created_at        timestamp     [not null, default: `now()`]
  updated_at        timestamp     [not null, default: `now()`]

  indexes {
    user_id
    status
    idempotency_key [unique]
    (contact_phone, created_at)
    (delivery_address, created_at)
    created_at
  }
}

Table order_lines {
  id                     UUID          [pk, default: `gen_random_uuid()`]
  order_id               UUID          [not null, ref: > orders.id]
  product_id             UUID          [null, ref: > products.id, note: "Referencia blanda: puede ser null si el producto se elimina del catalogo."]
  product_name_snapshot  text          [not null, note: "Nombre del producto en el momento de la compra. Inmutable."]
  unit_price_snapshot    decimal(10,2) [not null, note: "Precio unitario en el momento de la compra. Inmutable."]
  quantity               int           [not null, note: "Minimo 1."]
  line_total             decimal(10,2) [not null, note: "unit_price_snapshot x quantity. Calculado en servidor."]
  selected_options       jsonb         [null, note: "Snapshot historico de opciones elegidas. No usa FK."]
  removed_ingredients    "text[]"      [null, note: "Ingredientes eliminados por el cliente. Array de nombres (snapshot)."]
  notes                  text          [null]
}

Table order_status_history {
  id          UUID         [pk, default: `gen_random_uuid()`]
  order_id    UUID         [not null, ref: > orders.id]
  status      OrderStatus  [not null, note: "Nuevo estado del pedido en esta transicion."]
  changed_by  UUID         [null, ref: > users.id, note: "null = cambio automatico del sistema; no nulo = admin que hizo el cambio."]
  changed_at  timestamp    [not null, default: `now()`]
  note        text         [null, note: "Razon del cambio. Ej: 'Confirmado por operador' o 'Cancelado: sin respuesta'."]

  indexes {
    order_id
    (order_id, changed_at)
  }
}

/////////////////////////////////////////////////////////////////////
// ANTI-FRAUDE
/////////////////////////////////////////////////////////////////////

Table blacklist {
  id          UUID          [pk, default: `gen_random_uuid()`]
  type        BlacklistType [not null]
  value       text          [not null, note: "El valor bloqueado. Normalizado (telefono en E.164, email en minusculas)."]
  reason      text          [null]
  expires_at  timestamp     [null, note: "Retencion maxima 1 anyo (RGPD). Job periodico purga filas expiradas."]
  created_at  timestamp     [not null, default: `now()`]

  indexes {
    (type, value)
    expires_at
  }
}

/////////////////////////////////////////////////////////////////////
// EMPLEO (MVP DEFINITIVO)
/////////////////////////////////////////////////////////////////////

Table job_applications {
  id               UUID      [pk, default: `gen_random_uuid()`]
  name             text      [not null]
  phone            text      [not null, note: "E.164. Validado con libphonenumber-js."]
  email            text      [not null]
  message          text      [null]
  cv_file_path     text      [null, note: "Ruta en almacenamiento del servidor o bucket. Solo PDF/DOC/DOCX."]
  cv_original_name text      [null, note: "Nombre original del archivo subido por el usuario."]
  rgpd_consent     boolean   [not null, note: "Consentimiento RGPD obligatorio antes del envio."]
  created_at       timestamp [not null, default: `now()`]
}
```

---

## 3. Descripcion de entidades y campos

### User

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador unico del usuario, generado por la BD. |
| `email` | CITEXT UNIQUE | Email del usuario. Tipo `citext` para comparacion case-insensitive sin `LOWER()`. |
| `password_hash` | TEXT | Hash de la contrasena. bcrypt (cost >= 12) o argon2id. NUNCA en texto plano. |
| `first_name` | TEXT | Nombre del usuario (requerido en registro). |
| `last_name` | TEXT | Apellidos del usuario (requerido en registro). |
| `phone` | TEXT nullable | Numero de telefono normalizado a E.164. Validado con `libphonenumber-js`. Solo telefonos validos en Espanya. |
| `phone_verified` | BOOLEAN | `true` cuando el usuario completa el flujo OTP. Campo preparado para uso futuro (OTP SMS no activado en MVP). |
| `role` | ROLE enum | `CUSTOMER` (por defecto) o `ADMIN`. |
| `accepted_terms` | BOOLEAN | Consentimiento de condiciones de venta. Obligatorio al registrarse. |
| `accepted_privacy` | BOOLEAN | Consentimiento de politica de datos. Obligatorio (RGPD). |
| `accepted_marketing` | BOOLEAN | Consentimiento para comunicaciones comerciales. Opcional. |
| `age_confirmed` | BOOLEAN | Declaracion de ser mayor de 18 anyos. |
| `deleted_at` | TIMESTAMP nullable | Soft delete RGPD. Cuando no es null, la cuenta se considera anonimizada. |
| `created_at` / `updated_at` | TIMESTAMP | Fechas de auditoria automaticas. |

**Nota sobre el derecho de borrado (RGPD):** cuando el usuario solicita borrar su cuenta (`DELETE /api/users/me`), el proceso recomendado es sobreescribir `first_name`, `last_name`, `phone` y `email` con valores anonimizados y poner `deleted_at = now()`. Los pedidos historicos conservan los snapshots de producto (sin datos personales) para la contabilidad del negocio.

---

### RefreshToken

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador del token. |
| `user_id` | UUID FK | Usuario al que pertenece la sesion. |
| `token_hash` | TEXT | SHA-256 del refresh token. NUNCA el token en claro. |
| `expires_at` | TIMESTAMP | Fecha de expiracion del token. |
| `revoked_at` | TIMESTAMP nullable | `null` = sesion activa. Si tiene fecha, la sesion fue revocada (logout o "cerrar todas las sesiones"). |
| `user_agent` | TEXT nullable | User-Agent del navegador/app al crear el token. Util para mostrar sesiones activas al usuario. |
| `ip` | TEXT nullable | IP de origen. Solo para auditoria interna; NUNCA loguear en ficheros de log. |

---

### Category

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador de la categoria. |
| `slug` | TEXT UNIQUE | Identificador URL-friendly: `classics`, `burgers`, `drinks`. |
| `label` | TEXT | Nombre corto para la pestanya de navegacion: "Clasicos", "Tapas". |
| `heading` | TEXT | Titulo grande de la seccion visible en la carta. |
| `sort_order` | INT | Posicion de la categoria en la carta. |

---

### Product

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador del producto. |
| `category_id` | UUID FK | Categoria a la que pertenece. |
| `name` | TEXT | Nombre del producto. |
| `description` | TEXT nullable | Descripcion de ingredientes visible al cliente. |
| `price` | NUMERIC(10,2) | Precio base. El precio final puede variar por `price_delta` de `OptionChoice`. |
| `available` | BOOLEAN | Si es `false`, el producto no aparece en `GET /api/catalog`. |
| `sort_order` | INT | Posicion dentro de la categoria. |

---

### Allergen

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador del alergeno. |
| `name` | TEXT UNIQUE | Nombre normalizado: `gluten`, `lacteos`, `huevos`, `sesamo`, `mostaza`, `pescado`, `soja`, `frutos secos`. 14 alergenos de declaracion obligatoria UE. |
| `icon` | TEXT nullable | Emoji o nombre de icono para la interfaz. |

---

### ProductAllergen (tabla de union)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `product_id` | UUID FK | Referencia al producto. |
| `allergen_id` | UUID FK | Referencia al alergeno. PK compuesta `(product_id, allergen_id)`. |

---

### OptionGroup

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador del grupo de opciones. |
| `product_id` | UUID FK | Producto al que pertenece. |
| `label` | TEXT | Titulo del grupo: "Elige tu acompanyante", "Elige tu salsa". |
| `type` | TEXT | `single` (radio). Extensible a `multi` en el futuro. |
| `sort_order` | INT | Orden de aparicion. |

---

### OptionChoice

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador de la opcion. |
| `option_group_id` | UUID FK | Grupo al que pertenece. |
| `label` | TEXT | Texto de la opcion: "Bravas", "Fritas", "Sin salsa". |
| `price_delta` | NUMERIC(10,2) | Suplemento de precio. `0.00` en la mayoria de casos. |
| `sort_order` | INT | Orden de aparicion dentro del grupo. |
| `available` | BOOLEAN | Si es `false`, la opcion no se muestra. |

---

### Ingredient

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador del ingrediente. |
| `product_id` | UUID FK | Producto al que pertenece. |
| `name` | TEXT | Nombre del ingrediente removible: "Queso cheddar", "Jalapenos". |
| `sort_order` | INT | Orden de aparicion. |

---

### Order

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador del pedido. |
| `user_id` | UUID FK | Usuario que realiza el pedido. Obligatorio: no hay pedido de invitado. |
| `status` | OrderStatus enum | Estado actual. Todos los pedidos nacen en `PENDING`. Solo el admin cambia el estado. |
| `mode` | OrderMode enum | `PICKUP` o `DELIVERY`. |
| `delivery_address` | TEXT nullable | Direccion de entrega. Solo si `mode = DELIVERY`. Debe incluir "Mataro" o CP 08301-08304. |
| `timing` | OrderTiming enum | `ASAP` o `SCHEDULED`. |
| `scheduled_for` | TIMESTAMP nullable | Fecha y hora programada. Solo si `timing = SCHEDULED`. |
| `payment_method` | PaymentMethod enum | `CARD` o `CASH`. Pago al recibir. Sin cobro online. |
| `total` | NUMERIC(10,2) | Total autoritativo del pedido, calculado en el servidor. NUNCA aceptado del cliente. |
| `contact_phone` | TEXT | Telefono de contacto para el pedido (E.164). |
| `age_confirmed` | BOOLEAN | El cliente declara ser mayor de 18 anyos. |
| `idempotency_key` | TEXT UNIQUE | UUID v4 enviado por el cliente. Previene pedidos duplicados en 24h. |
| `notes` | TEXT nullable | Nota general del pedido. |

---

### OrderLine

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador de la linea. |
| `order_id` | UUID FK | Pedido al que pertenece. |
| `product_id` | UUID nullable FK | Referencia blanda al producto. `null` si el producto se ha eliminado del catalogo; el historico sigue legible via snapshots. |
| `product_name_snapshot` | TEXT | Nombre del producto en el momento de la compra. Inmutable. |
| `unit_price_snapshot` | NUMERIC(10,2) | Precio unitario en el momento de la compra (precio base + delta de opcion). Inmutable. |
| `quantity` | INT | Unidades pedidas. Minimo 1. |
| `line_total` | NUMERIC(10,2) | `unit_price_snapshot x quantity`. Calculado en servidor. |
| `selected_options` | JSONB nullable | Snapshot de opciones elegidas. No usa FK: es un historico inmutable. |
| `removed_ingredients` | TEXT[] nullable | Ingredientes que el cliente pidio eliminar. Array de nombres (snapshot, no FK). |
| `notes` | TEXT nullable | Nota libre del cliente para esta linea: "sin sal", "bien hecho". |

---

### OrderStatusHistory

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador del registro. |
| `order_id` | UUID FK | Pedido al que pertenece. |
| `status` | OrderStatus enum | Estado al que transiciono el pedido en este momento. |
| `changed_by` | UUID nullable FK | Usuario (admin) que hizo el cambio. `null` si fue un cambio automatico del sistema (ej: creacion inicial PENDING). |
| `changed_at` | TIMESTAMP | Fecha y hora exacta del cambio. |
| `note` | TEXT nullable | Razon del cambio. Ej: "Confirmado por operador", "Cancelado: direccion fuera de zona". |

---

### Blacklist

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador del registro. |
| `type` | BlacklistType enum | Tipo de valor bloqueado: `phone`, `address`, `email`, `ip`. |
| `value` | TEXT | El valor bloqueado, normalizado. |
| `reason` | TEXT nullable | Motivo del bloqueo (para el backoffice). |
| `expires_at` | TIMESTAMP nullable | Fecha de expiracion. Retencion maxima 1 anyo (RGPD). Job periodico purga los registros expirados. |

---

### JobApplication (MVP definitivo)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID PK | Identificador de la candidatura. |
| `name` | TEXT | Nombre completo del candidato. |
| `phone` | TEXT | Telefono del candidato (E.164). |
| `email` | TEXT | Email del candidato. |
| `message` | TEXT nullable | Carta de presentacion. Opcional. |
| `cv_file_path` | TEXT nullable | Ruta del CV en el servidor o bucket (solo PDF/DOC/DOCX). |
| `cv_original_name` | TEXT nullable | Nombre original del archivo, para mostrarlo en el backoffice. |
| `rgpd_consent` | BOOLEAN | Consentimiento RGPD obligatorio antes del envio. |
| `created_at` | TIMESTAMP | Fecha de envio de la candidatura. |

---

## 4. Enums

| Enum | Valores | Notas |
|------|---------|-------|
| `Role` | `CUSTOMER`, `ADMIN` | Default `CUSTOMER`. Solo una cuenta `ADMIN`. |
| `OrderStatus` | `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` | `READY` aplica a pedidos `PICKUP`. `OUT_FOR_DELIVERY` aplica a `DELIVERY`. |
| `OrderMode` | `PICKUP`, `DELIVERY` | Recoger en local o entrega a domicilio. |
| `OrderTiming` | `ASAP`, `SCHEDULED` | Lo antes posible o con hora programada. |
| `PaymentMethod` | `CARD`, `CASH` | Pago al recibir. Sin cobro online. |
| `BlacklistType` | `phone`, `address`, `email`, `ip` | Tipo de valor en la lista negra. |

### Ciclo de vida de OrderStatus

```
PENDING (todos los pedidos nacen aqui)
  │
  ├─► CONFIRMED ──► PREPARING ──► READY           (PICKUP)
  │                           └──► OUT_FOR_DELIVERY ──► DELIVERED
  │
  └─► CANCELLED  (desde cualquier estado antes de DELIVERED)
```

**Regla unica de confirmacion:** el admin revisa TODOS los pedidos en `PENDING` y los mueve manualmente a `CONFIRMED` o `CANCELLED`. No hay confirmacion automatica. Cada transicion queda registrada en `OrderStatusHistory`.

---

## 5. Decisiones de disenyo aplicadas

1. **UUIDs como PK:** mas seguros que enteros secuenciales (no enumerable, compatible con Prisma y distribuido).
2. **`citext` para email:** la extension `citext` de PostgreSQL permite comparacion case-insensitive sin `LOWER()` en cada query. Requiere `CREATE EXTENSION IF NOT EXISTS citext` en la migracion inicial.
3. **Snapshots en OrderLine:** `product_name_snapshot` y `unit_price_snapshot` desacoplan el historico de pedidos del catalogo. Cambiar precios o eliminar productos no altera ordenes pasadas.
4. **JSONB para `selected_options`:** snapshot historico; no necesita FK. Legible directamente desde el backoffice.
5. **TEXT[] para `removed_ingredients`:** array nativo de PostgreSQL, soportado por Prisma. Snapshot historico (no FK).
6. **`product_id` nullable en OrderLine:** "referencia blanda". El JOIN funciona para productos activos; el historico sobrevive si el producto se borra.
7. **Soft delete en User:** `deleted_at` + sobreescritura de datos personales. Cumple el derecho de borrado RGPD sin romper claves foraneas en `Order`.
8. **Blacklist con `expires_at`:** retencion maxima 1 anyo (RGPD). Job periodico de purga.
9. **`idempotency_key` UNIQUE en Order:** previene pedidos duplicados.
10. **`JobApplication` sin FK a `User`:** los candidatos no tienen por que tener cuenta. Tabla completamente independiente.
11. **Catalogo normalizado:** `Allergen` como entidad independiente. Permite filtrar por alergeno, anadir icono, listar los 14 de declaracion obligatoria UE.
12. **`RefreshToken` en BD:** permite revocar sesiones individuales o todas. Token hash en SHA-256; NUNCA el token en claro.
13. **`OrderStatusHistory`:** trazabilidad completa de transiciones. Permite auditoria en el backoffice y depuracion de incidencias.
14. **Todos los pedidos en `PENDING`:** simplificacion del MVP. Sin logica condicional de umbrales. El admin tiene control total.

---

*Documento actualizado y aprobado el 2026-06-14. Schema generado en `backend/prisma/schema.prisma`.*
