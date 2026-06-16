import rateLimit from 'express-rate-limit'

/**
 * 429 response handler for all rate limiters.
 * Exported for unit testing; not called in test mode (passthrough is used instead).
 */
export const json429 = (_req, res) =>
  res
    .status(429)
    .set('Retry-After', '60')
    .json({ error: 'Too many requests. Please try again later.' })

/**
 * Creates a rate limiter or returns a passthrough based on the environment.
 * In test mode (TEST_DISABLE_RATE_LIMIT=true), all limiters are passthrough
 * so integration tests are not affected by IP-based counters.
 */
export function makeLimiter(opts) {
  if (process.env.TEST_DISABLE_RATE_LIMIT === 'true') {
    return (_req, _res, next) => next()
  }
  return rateLimit({ ...opts, handler: json429, standardHeaders: true, legacyHeaders: false })
}

/**
 * Rate limiters per endpoint group.
 * All limits are per-IP (express-rate-limit default keyGenerator).
 */

// POST /api/auth/register — 3 req/IP per hour
export const registerLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
})

// POST /api/auth/login — 5 req/IP per 15 min
export const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
})

// POST /api/orders — 5 req/IP per hour
export const orderLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
})

// POST /api/auth/google — 5 req/IP per 15 min
// Mirrors loginLimiter: this endpoint issues the same JWT session cookie, so it
// must not be a more permissive path to authentication than password login.
export const googleAuthLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
})

// POST /api/reservations — 5 req/IP per hour
export const reservationLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
})

// POST /api/addresses — 20 req/IP per hour
// Authenticated endpoint; the 10-address-per-user cap in the service is the
// primary anti-abuse measure. Rate limiting adds a secondary layer.
export const addressMutationLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
})
