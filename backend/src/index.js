// ============================================================
// La Casa Nostra — Express app entry point
// ============================================================

import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config/env.js'
import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'

// Routes
import authRoutes from './routes/auth.js'
import catalogRoutes from './routes/catalog.js'
import ordersRoutes from './routes/orders.js'
import adminRoutes from './routes/admin.js'
import usersRoutes from './routes/users.js'
import reservationsRoutes from './routes/reservations.js'
import addressesRoutes from './routes/addresses.js'

const app = express()

// ── Security headers
app.use(helmet())

// ── CORS (restricted to allowed origins)
app.use(corsMiddleware)

// ── Body parsing — hard cap at 10 KB (anti-abuse)
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false, limit: '10kb' }))

// ── Cookie parsing (for httpOnly JWT cookie)
app.use(cookieParser())

// ── Request logging (no PII — only timestamp, endpoint, status, anon session id)
app.use(requestLogger)

// ── Health check (no auth required)
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── API routes
app.use('/api/auth', authRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/reservations', reservationsRoutes)
app.use('/api/addresses', addressesRoutes)

// ── 404 handler (must be after all routes)
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// ── Global error handler (must be last)
app.use(errorHandler)

// Only start the server when this file is the entry point (not when imported by tests).
// NODE_ENV=test skips the listen call so Supertest can bind its own ephemeral port.
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`LCN backend running on port ${config.port} [${config.nodeEnv}]`)
  })
}

export default app
