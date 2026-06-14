// ============================================================
// Prisma seed — creates the initial ADMIN user.
// Run with: npm run prisma:seed
//
// Requires env var: ADMIN_INITIAL_PASSWORD
// The password is hashed with argon2id; never stored in plain text.
// ============================================================

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

// Email de la cuenta admin única. Por defecto el email real del negocio
// (ver frontend/src/data/business.js). Configurable por env si se desea otro.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'lacasanostramataro@gmail.com'

async function main() {
  const rawPassword = process.env.ADMIN_INITIAL_PASSWORD
  if (!rawPassword || rawPassword.trim().length < 12) {
    throw new Error(
      'ADMIN_INITIAL_PASSWORD env var is missing or too short (min 12 chars). ' +
        'Set it in your .env file and retry.'
    )
  }

  const passwordHash = await argon2.hash(rawPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  })

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      // Refresh the password hash on re-seed
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Admin',
      lastName: 'La Casa Nostra',
      role: 'ADMIN',
      phoneVerified: false,
      // Admin account is pre-authorised — no real RGPD consent flow needed
      acceptedTerms: true,
      acceptedPrivacy: true,
    },
  })

  console.log(`[seed] Admin user upserted: ${admin.email} (id: ${admin.id})`)
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
