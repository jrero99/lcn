import rateLimit from 'express-rate-limit'

const json429 = (_req, res) =>
  res
    .status(429)
    .set('Retry-After', '60')
    .json({ error: 'Too many requests. Please try again later.' })

/**
 * Rate limiters per endpoint group.
 * All limits are per-IP (express-rate-limit default keyGenerator).
 */

// POST /api/auth/register — 3 req/IP per hour
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/auth/login — 5 req/IP per 15 min
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/orders — 5 req/IP per hour
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/auth/google — 5 req/IP per 15 min
// Mirrors loginLimiter: this endpoint issues the same JWT session cookie, so it
// must not be a more permissive path to authentication than password login.
export const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/reservations — 5 req/IP per hour
export const reservationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/addresses — 20 req/IP per hour
// Authenticated endpoint; the 10-address-per-user cap in the service is the
// primary anti-abuse measure. Rate limiting adds a secondary layer.
export const addressMutationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
})
