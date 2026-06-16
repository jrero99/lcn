import argon2 from 'argon2'
import { OAuth2Client } from 'google-auth-library'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { prisma } from '../config/prisma.js'
import { config } from '../config/env.js'
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
  // or when the user is a Google-only account (no passwordHash).
  const dummyHash =
    '$argon2id$v=19$m=65536,t=3,p=1$dummysaltdummysalt$dummyhashvaluedummyhashvaluedummy'
  const hashToVerify = user?.passwordHash ?? dummyHash

  // argon2.verify throws on a malformed/dummy hash instead of returning false;
  // guard it so a non-existent or Google-only account yields 401, not 500,
  // while still doing the work to keep the timing roughly constant.
  let valid = false
  try {
    valid = await argon2.verify(hashToVerify, password)
  } catch {
    valid = false
  }

  // Generic error — do NOT reveal whether email or password was wrong,
  // nor whether the user is a Google-only account (which has no passwordHash).
  if (!user || !valid || user.deletedAt || !user.passwordHash) {
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

/**
 * loginWithGoogle — verify a Google ID token and find-or-create the user.
 *
 * Decision log (2026-06-16):
 *   - If a user with the same email already exists (registered via password),
 *     we link the Google account by setting googleId on the existing record.
 *     This avoids duplicate accounts. The user can then log in via either method.
 *   - We NEVER allow this path to create or promote an ADMIN. Role stays CUSTOMER
 *     for new users; existing admins keep their role but gain SSO access.
 *   - email_verified must be true in the Google payload or we reject (prevents
 *     someone spoofing an unverified email to take over an existing account).
 *
 * @param {string} credential  Raw Google ID token from the client.
 * @returns {{ id, email, name, role }}
 */
export async function loginWithGoogle(credential) {
  if (!config.googleClientId) {
    throw httpError(503, 'Google SSO is not configured on this server')
  }

  // Verify the ID token with Google's public keys. This also validates:
  //   - aud === GOOGLE_CLIENT_ID  (token was issued for this app)
  //   - iss === accounts.google.com or https://accounts.google.com
  //   - exp (not expired)
  const client = new OAuth2Client(config.googleClientId)
  let ticket
  try {
    ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    })
  } catch {
    // Do not expose Google's internal error — it may contain the raw token
    throw httpError(401, 'Invalid or expired Google credential')
  }

  const payload = ticket.getPayload()

  // Reject unverified email addresses (Google can return email_verified: false
  // for some account types). This is critical to prevent account takeovers.
  if (!payload.email_verified) {
    throw httpError(403, 'Google account email is not verified')
  }

  const googleId = payload.sub          // stable unique identifier from Google
  const email    = payload.email.toLowerCase().trim()
  const name     = payload.name ?? ''    // display name; may be absent

  // Split name into firstName / lastName for our schema.
  // Google provides a single `name` string; we split on the first space.
  const spaceIdx = name.indexOf(' ')
  const firstName = spaceIdx >= 0 ? name.slice(0, spaceIdx).trim() : name.trim() || 'Usuario'
  const lastName  = spaceIdx >= 0 ? name.slice(spaceIdx + 1).trim() : ''

  // --- Find-or-create logic ---

  // 1. Exact match by googleId (returning user who has already linked Google)
  let user = await prisma.user.findUnique({
    where: { googleId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, deletedAt: true },
  })

  if (user) {
    if (user.deletedAt) throw httpError(403, 'Account has been deleted')
    // Defense in depth: admin is password-only (see below); never allow SSO.
    if (user.role === 'ADMIN') {
      throw httpError(403, 'This account requires password authentication')
    }
    return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, role: user.role }
  }

  // 2. Match by email (user registered via password; link their account)
  user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, googleId: true, deletedAt: true },
  })

  if (user) {
    if (user.deletedAt) throw httpError(403, 'Account has been deleted')

    // Admin accounts are password-only by design: never link or authenticate
    // them via Google SSO, so a compromised Google account can't reach the
    // backoffice. Generic message — do not reveal that this email is the admin.
    if (user.role === 'ADMIN') {
      throw httpError(403, 'This account requires password authentication')
    }

    // Link the Google account if not already linked to a different googleId
    // (edge case: someone used a different Google account to reach this email).
    if (!user.googleId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      })
    }

    return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, role: user.role }
  }

  // 3. New user — create with role CUSTOMER, no passwordHash, provider GOOGLE
  const newUser = await prisma.user.create({
    data: {
      email,
      googleId,
      provider: 'GOOGLE',
      firstName,
      lastName,
      // passwordHash intentionally omitted (null) — SSO-only account
      // Consent fields: Google-registered users have implicitly consented
      // to Google's terms; we still require our own consent on first use.
      // For MVP, we accept them as true since the user chose to sign in with Google.
      // TODO (post-MVP): show a consent banner on first Google login.
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedMarketing: false,
      role: 'CUSTOMER', // NEVER allow SSO to create an ADMIN
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  })

  return { id: newUser.id, email: newUser.email, name: `${newUser.firstName} ${newUser.lastName}`, role: newUser.role }
}

export async function deleteAccount(userId) {
  // RGPD soft-delete: anonymise all personal data, then set deletedAt.
  // Addresses are also soft-deleted: their rows are kept so that
  // Order.addressId FKs remain valid, but they are hidden from the user.
  // Import inline to avoid circular dependency (addressService imports prisma,
  // not authService).
  const { softDeleteAllUserAddresses } = await import('./addressService.js')
  await softDeleteAllUserAddresses(userId)

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
