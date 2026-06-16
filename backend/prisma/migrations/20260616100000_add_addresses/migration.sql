-- Migration: add_addresses
-- Date: 2026-06-16
-- Description:
--   1. Create the `addresses` table for user-saved delivery addresses.
--   2. Add soft FK `address_id` to `orders` (nullable, for traceability).
--   3. Add index on `orders.address_id`.
--
-- Design decisions documented in schema.prisma (Address model comments).

-- 1. Create the addresses table
--    • Soft-delete via deleted_at (NULL = active, non-NULL = logically deleted).
--    • postal_code is CHAR(5) — always 5 digits.
--    • No CHECK constraint on postal code / city zone: validation is in the
--      application layer (validators/addresses.js) so errors can be returned
--      as structured API responses with user-friendly messages.
CREATE TABLE "addresses" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID         NOT NULL,
    "label"       VARCHAR(50),
    "street"      VARCHAR(200) NOT NULL,
    "number"      VARCHAR(10)  NOT NULL,
    "floor_door"  VARCHAR(50),
    "postal_code" CHAR(5)      NOT NULL,
    "city"        VARCHAR(100) NOT NULL,
    "notes"       VARCHAR(300),
    "deleted_at"  TIMESTAMP(3),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- 2. FK to users — CASCADE on delete not used intentionally: addresses should
--    survive a user soft-delete (RGPD anonimization sets deletedAt on the user
--    but does NOT hard-delete rows, so this FK would never break in practice).
ALTER TABLE "addresses"
    ADD CONSTRAINT "addresses_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- 3. Indexes on addresses
CREATE INDEX "addresses_user_id_idx"              ON "addresses"("user_id");
CREATE INDEX "addresses_user_id_deleted_at_idx"   ON "addresses"("user_id", "deleted_at");

-- 4. Add address_id (soft FK) to orders
--    NULL for PICKUP orders and orders created before this migration.
ALTER TABLE "orders"
    ADD COLUMN "address_id" UUID;

-- 5. FK from orders.address_id to addresses.id
--    ON DELETE SET NULL: if an Address row is hard-deleted (should never happen
--    with soft-delete, but as a safety net) the order keeps its delivery_address
--    snapshot and address_id becomes NULL rather than blocking the delete.
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_address_id_fkey"
    FOREIGN KEY ("address_id")
    REFERENCES "addresses"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- 6. Index on orders.address_id for JOIN lookups from the admin panel
CREATE INDEX "orders_address_id_idx" ON "orders"("address_id");
