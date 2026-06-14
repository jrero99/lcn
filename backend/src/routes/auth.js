import { Router } from 'express'
import { registerLimiter, loginLimiter } from '../middleware/rateLimiter.js'
import { honeypot } from '../middleware/honeypot.js'
import { requireAuth } from '../middleware/auth.js'
import * as ctrl from '../controllers/authController.js'

const router = Router()

// POST /api/auth/register
// Rate: 3 req/IP/hour | Honeypot | No ADMIN self-assignment possible
router.post('/register', registerLimiter, honeypot, ctrl.register)

// POST /api/auth/login
// Rate: 5 req/IP/15min | Generic error (no email/password distinction)
router.post('/login', loginLimiter, ctrl.login)

// POST /api/auth/logout
router.post('/logout', ctrl.logout)

// GET /api/auth/me — requires auth
router.get('/me', requireAuth, ctrl.me)

export default router
