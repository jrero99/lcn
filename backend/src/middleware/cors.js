import { config } from '../config/env.js'

/**
 * Manual CORS middleware — restricted to the configured origins.
 * We do this manually instead of using the `cors` npm package to keep
 * the dependency list minimal and the logic explicit.
 */
export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin

  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PATCH, DELETE, OPTIONS'
    )
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    )
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
}
