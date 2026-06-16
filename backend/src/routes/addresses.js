import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { addressMutationLimiter } from '../middleware/rateLimiter.js'
import {
  getAddresses,
  addAddress,
  editAddress,
  deleteAddress,
} from '../controllers/addressController.js'

const router = Router()

// All address routes require authentication.
// requireAuth is applied as the first middleware on every route so that
// unauthenticated requests receive 401 before any other processing.

// GET /api/addresses
// Returns all active addresses for the authenticated user.
// No mutation, no rate limit (reads are cheap).
router.get('/', requireAuth, getAddresses)

// POST /api/addresses
// Creates a new address. Rate-limited to prevent address-spam.
router.post('/', requireAuth, addressMutationLimiter, addAddress)

// PATCH /api/addresses/:id
// Partially updates an address. Rate-limited.
router.patch('/:id', requireAuth, addressMutationLimiter, editAddress)

// DELETE /api/addresses/:id
// Soft-deletes an address. Rate-limited.
router.delete('/:id', requireAuth, addressMutationLimiter, deleteAddress)

export default router
