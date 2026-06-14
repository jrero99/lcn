import { config } from '../config/env.js'

/**
 * Global Express error handler.
 * - Never leaks internal stack traces in production.
 * - Handles Zod validation errors (shape: { issues[] }).
 * - Handles Prisma unique constraint errors (P2002).
 */
export function errorHandler(err, _req, res, _next) {
  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      error: 'Validation error',
      issues: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    })
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists' })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Operational errors with explicit status
  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }

  // Unknown — log internally, respond generically
  console.error('[ERROR]', err)
  const body = { error: 'Internal server error' }
  if (!config.isProd) body.detail = err.message
  res.status(500).json(body)
}
