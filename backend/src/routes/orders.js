import { Router } from 'express'
import { orderLimiter } from '../middleware/rateLimiter.js'
import { honeypot } from '../middleware/honeypot.js'
import { requireAuth } from '../middleware/auth.js'
import { placeOrder } from '../controllers/orderController.js'

const router = Router()

// POST /api/orders
// Auth required | Rate: 5 req/IP/hour | Honeypot | Server-side total recalculation
router.post('/', requireAuth, orderLimiter, honeypot, placeOrder)

export default router
