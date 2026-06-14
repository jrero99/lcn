import argon2 from 'argon2'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { prisma } from '../config/prisma.js'
import { httpError } from '../utils/httpError.js'

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
}

// Per-account login failure counter (in-memory; replace with Redis in multi-instance)
const loginFailures = new Map() // email -> { count, lockedUntil }
const MAX_FAILURES = 10
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 min

export function normalizePhone(raw) {
  try {
    if (!isValidPhoneNumber(raw.trim(), 'ES')) throw new Error()
    const parsed = parsePhoneNumber(raw.trim(), 'ES')
    return parsed.format('E.164')
  } catch {
    throw httpError(422, 'Invalid Spanish phone number')
  }
}

export async function register(data) {
  const {
    name,
    apellidos,
    email,
    password,
    phone,
    consentMarketing,
    consentConditions,
    consentPrivacy,
  } = data

  const normalizedPhone = phone ? normalizePhone(phone) : undefined

  // Hash password with argon2id
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS)

  // Create user — Prisma throws P2002 if email already exists
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: name.trim(),
      lastName: apellidos.trim(),
      phone: normalizedPhone,
      acceptedTerms: consentConditions,
      acceptedPrivacy: consentPrivacy,
      acceptedMarketing: consentMarketing ?? false,
      role: 'CUSTOMER', // Never allow self-assigning ADMIN
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  })

  return user
}

export async function login(email, password) {
  // Check account lock
  const failure = loginFailures.get(email)
  if (failure?.lockedUntil && failure.lockedUntil > Date.now()) {
    throw httpError(
      429,
      'Account temporarily locked due to too many failed attempts. Try again later.'
    )
  }

  // Fetch the user — always run argon2.verify to prevent timing attacks
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      passwordHash: true,
      deletedAt: true,
    },
  })

  // Dummy hash ensures constant-time verification even when user does not exist
  const dummyHash =
    '$argon2id$v=19$m=65536,t=3,p=1$dummysaltdummysalt$dummyhashvaluedummyhashvaluedummy'
  const hashToVerify = user?.passwordHash ?? dummyHash

  const valid = await argon2.verify(hashToVerify, password)

  // Generic error — do NOT reveal whether email or password was wrong
  if (!user || !valid || user.deletedAt) {
    const rec = loginFailures.get(email) ?? { count: 0, lockedUntil: null }
    rec.count += 1
    if (rec.count >= MAX_FAILURES) {
      rec.lockedUntil = Date.now() + LOCK_DURATION_MS
    }
    loginFailures.set(email, rec)
    throw httpError(401, 'Invalid credentials')
  }

  // Reset failure counter on success
  loginFailures.delete(email)

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role,
  }
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      phoneVerified: true,
      role: true,
      acceptedMarketing: true,
      createdAt: true,
    },
  })
  if (!user) throw httpError(404, 'User not found')
  return user
}

export async function deleteAccount(userId) {
  // RGPD soft-delete: anonymise all personal data, then set deletedAt
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${userId}@deleted`,
      firstName: '[deleted]',
      lastName: '[deleted]',
      phone: null,
      passwordHash: '[deleted]',
      deletedAt: new Date(),
    },
  })
}
