import { Router } from 'express'
import { reservationLimiter } from '../middleware/rateLimiter.js'
import { honeypot } from '../middleware/honeypot.js'
import { createReservation } from '../controllers/reservationController.js'

const router = Router()

// POST /api/reservations
// Public (no auth required) | Rate: 5 req/IP/hour | Honeypot
router.post('/', reservationLimiter, honeypot, createReservation)

export default router
