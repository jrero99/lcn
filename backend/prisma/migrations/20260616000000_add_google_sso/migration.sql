-- Migration: add_google_sso
-- Date: 2026-06-16
-- Description:
--   1. Add AuthProvider enum (PASSWORD | GOOGLE).
--   2. Add google_id column to users (nullable, unique).
--   3. Add provider column to users (default PASSWORD).
--   4. Make password_hash nullable (Google-only users have no local password).

-- 1. Create the AuthProvider enum type
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE');

-- 2. Add google_id — nullable, will be populated for Google SSO users
ALTER TABLE "users"
  ADD COLUMN "google_id" TEXT;

-- 3. Add provider column with default PASSWORD (existing users keep PASSWORD)
ALTER TABLE "users"
  ADD COLUMN "provider" "AuthProvider" NOT NULL DEFAULT 'PASSWORD';

-- 4. Make password_hash nullable
--    Existing rows already have a value; new Google-only rows will have NULL.
ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;

-- 5. Unique constraint on google_id (NULL values are excluded from uniqueness check in PostgreSQL)
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- 6. Regular index on google_id for fast lookups
CREATE INDEX "users_google_id_idx" ON "users"("google_id");
