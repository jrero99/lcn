// ============================================================
// Address controller — handlers for /api/addresses
//
// All routes require authentication (requireAuth middleware).
// Ownership enforcement is done in addressService (never trust
// a bare addressId — always resolve with the authenticated userId).
// ============================================================

import { createAddressSchema, updateAddressSchema } from '../validators/addresses.js'
import {
  listAddresses,
  createAddress,
  updateAddress,
  softDeleteAddress,
} from '../services/addressService.js'

/**
 * GET /api/addresses
 * Returns all active (non-deleted) addresses for the authenticated user.
 *
 * Response 200: { addresses: Address[] }
 */
export async function getAddresses(req, res, next) {
  try {
    const addresses = await listAddresses(req.user.id)
    res.json({ addresses })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/addresses
 * Creates a new saved address for the authenticated user.
 *
 * Request body: { label?, street, number, floorDoor?, postalCode, city, notes? }
 * Response 201: { address: Address }
 * Errors:
 *   422 — Zod validation failed or delivery zone mismatch
 *   422 — User already has 10 addresses (anti-abuse cap)
 */
export async function addAddress(req, res, next) {
  try {
    const data = createAddressSchema.parse(req.body)
    const address = await createAddress(req.user.id, data)
    res.status(201).json({ address })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/addresses/:id
 * Partially updates a saved address owned by the authenticated user.
 *
 * Request body: any subset of { label?, street, number, floorDoor?, postalCode, city, notes? }
 * Response 200: { address: Address }
 * Errors:
 *   400 — :id is not a valid UUID format (caught by errorHandler)
 *   404 — address not found, already deleted, or belongs to another user
 *   422 — Zod validation failed or delivery zone mismatch
 */
export async function editAddress(req, res, next) {
  try {
    const { id } = req.params
    const data = updateAddressSchema.parse(req.body)
    const address = await updateAddress(req.user.id, id, data)
    res.json({ address })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/addresses/:id
 * Soft-deletes a saved address owned by the authenticated user.
 * The address is hidden from future GET requests but the row is
 * kept in the DB so that historical orders can still reference it.
 *
 * Response 204: (no body)
 * Errors:
 *   404 — address not found, already deleted, or belongs to another user
 */
export async function deleteAddress(req, res, next) {
  try {
    const { id } = req.params
    await softDeleteAddress(req.user.id, id)
    res.sendStatus(204)
  } catch (err) {
    next(err)
  }
}
