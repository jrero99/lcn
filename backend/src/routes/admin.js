import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import * as ctrl from '../controllers/adminController.js'

const router = Router()

// All admin routes require auth + ADMIN role (role verified from DB, not token)
router.use(requireAuth, requireAdmin)

// ── ORDERS ─────────────────────────────────────────────────
// GET  /api/admin/orders?status=PENDING_VERIFICATION&page=1&limit=20
router.get('/orders', ctrl.listOrders)

// PATCH /api/admin/orders/:id  — body: { status }
router.patch('/orders/:id', ctrl.updateOrderStatus)

// ── CATALOG ────────────────────────────────────────────────
// GET  /api/admin/catalog — full catalog including unavailable products
router.get('/catalog', ctrl.listAdminCatalog)

// POST /api/admin/catalog/products
router.post('/catalog/products', ctrl.createProduct)

// PATCH /api/admin/catalog/products/:id
router.patch('/catalog/products/:id', ctrl.updateProduct)

// DELETE /api/admin/catalog/products/:id
router.delete('/catalog/products/:id', ctrl.deleteProduct)

// ── USERS ──────────────────────────────────────────────────
// GET  /api/admin/users?page=1&limit=20
router.get('/users', ctrl.listUsers)

// GET  /api/admin/users/:id/addresses
router.get('/users/:id/addresses', ctrl.getUserAddresses)

// ── BLACKLIST ──────────────────────────────────────────────
// GET    /api/admin/blacklist
router.get('/blacklist', ctrl.listBlacklist)

// POST   /api/admin/blacklist  — body: { type, value, reason, expiresAt? }
router.post('/blacklist', ctrl.createBlacklistEntry)

// DELETE /api/admin/blacklist/:id
router.delete('/blacklist/:id', ctrl.deleteBlacklistEntry)

export default router
