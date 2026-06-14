import { Router } from 'express'
import { catalog } from '../controllers/catalogController.js'

const router = Router()

// GET /api/catalog — public
router.get('/', catalog)

export default router
