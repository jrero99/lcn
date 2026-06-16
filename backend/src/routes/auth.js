import { Router } from 'express'
import { registerLimiter, loginLimiter, googleAuthLimiter } from '../middleware/rateLimiter.js'
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

// POST /api/auth/google
// Google SSO: verifies Google ID token server-side, issues same JWT cookie as login.
// Rate: 10 req/IP/15min. No honeypot needed (no form field).
// If GOOGLE_CLIENT_ID is not configured, the service returns 503.
router.post('/google', googleAuthLimiter, ctrl.googleAuth)

// POST /api/auth/logout
router.post('/logout', ctrl.logout)

// GET /api/auth/me — requires auth
router.get('/me', requireAuth, ctrl.me)

export default router
