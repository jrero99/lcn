import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as authCtrl from '../controllers/authController.js'

const router = Router()

// DELETE /api/users/me — RGPD: soft-delete and anonymise account data
router.delete('/me', requireAuth, authCtrl.deleteAccount)

export default router
