// ============================================================
// Address service — business logic for /api/addresses
//
// Security invariant (enforced here AND in the controller):
//   Every operation checks that the address belongs to the
//   requesting user (req.user.id === address.userId).
//   Never trust a bare addressId without this ownership check.
//
// RGPD: when a user account is soft-deleted (DELETE /api/users/me),
//   addresses are NOT hard-deleted; they receive deletedAt = now()
//   so that historical orders keep their FK reference intact.
//   The caller (authService.deleteAccount) must also call
//   softDeleteAllUserAddresses(userId) during account deletion.
// ============================================================

import { prisma } from '../config/prisma.js'
import { httpError } from '../utils/httpError.js'

// ── Delivery-zone constants (kept in sync with validators/addresses.js) ───────
const MATARO_POSTAL_CODES = ['08301', '08302', '08303', '08304']

/**
 * Returns true if the city/postalCode combination falls within the delivery zone.
 * Mirrors refineDeliveryZone in validators/addresses.js — single source of truth
 * for the rule; the validator uses it for POST (all fields present) and this
 * service uses it for PATCH (merges incoming fields with the existing row first).
 *
 * @param {string} city
 * @param {string} postalCode
 * @returns {boolean}
 */
function isInDeliveryZone(city, postalCode) {
  const cityLower = (city ?? '').toLowerCase()
  const validCity = cityLower.includes('mataró') || cityLower.includes('mataro')
  const validPostal = MATARO_POSTAL_CODES.includes(postalCode ?? '')
  return validCity || validPostal
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Builds the human-readable snapshot string stored in Order.deliveryAddress.
 * Format: "<street> <number>[, <floorDoor>], <postalCode> <city>[ — <notes>]"
 *
 * This function is exported so orderService can call it when copying the
 * address snapshot at order creation time.
 *
 * @param {object} addr  Address row from Prisma
 * @returns {string}
 */
export function buildAddressSnapshot(addr) {
  let line = `${addr.street} ${addr.number}`
  if (addr.floorDoor) line += `, ${addr.floorDoor}`
  line += `, ${addr.postalCode} ${addr.city}`
  if (addr.notes) line += ` — ${addr.notes}`
  return line
}

/**
 * Selects only the fields exposed to the client.
 * Excludes: userId, deletedAt, updatedAt (internal).
 */
const ADDRESS_SELECT = {
  id: true,
  label: true,
  street: true,
  number: true,
  floorDoor: true,
  postalCode: true,
  city: true,
  notes: true,
  createdAt: true,
}

// ── CRUD operations ───────────────────────────────────────────

/**
 * Returns all active (non-soft-deleted) addresses for a user,
 * ordered by creation date ascending (oldest first = stable order).
 *
 * @param {string} userId
 * @returns {Promise<Address[]>}
 */
export async function listAddresses(userId) {
  return prisma.address.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    select: ADDRESS_SELECT,
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Creates a new address for the user.
 * Validates that there are not already 10 active addresses (anti-abuse).
 *
 * @param {string} userId
 * @param {object} data  Validated body from createAddressSchema
 * @returns {Promise<Address>}
 */
export async function createAddress(userId, data) {
  // Anti-abuse: cap at 10 active addresses per user
  const activeCount = await prisma.address.count({
    where: { userId, deletedAt: null },
  })
  if (activeCount >= 10) {
    throw httpError(
      422,
      'You have reached the maximum number of saved addresses (10). Please delete one before adding a new one.',
    )
  }

  return prisma.address.create({
    data: {
      userId,
      label: data.label ?? null,
      street: data.street,
      number: data.number,
      floorDoor: data.floorDoor ?? null,
      postalCode: data.postalCode,
      city: data.city,
      notes: data.notes ?? null,
    },
    select: ADDRESS_SELECT,
  })
}

/**
 * Updates an existing address.
 * Only the fields present in `data` are changed (partial update / PATCH semantics).
 * Throws 404 if the address does not exist or has been soft-deleted.
 * Throws 403 if the address belongs to a different user.
 *
 * @param {string} userId
 * @param {string} addressId
 * @param {object} data  Validated body from updateAddressSchema
 * @returns {Promise<Address>}
 */
export async function updateAddress(userId, addressId, data) {
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
    // Fetch city + postalCode so we can merge them with the incoming patch
    // and validate the effective delivery zone (M-1 fix).
    select: { id: true, userId: true, deletedAt: true, city: true, postalCode: true },
  })

  if (!existing || existing.deletedAt !== null) {
    throw httpError(404, 'Address not found')
  }
  if (existing.userId !== userId) {
    // Return 404 rather than 403 to avoid leaking existence of other users' addresses
    throw httpError(404, 'Address not found')
  }

  // M-1 fix: when the PATCH touches city and/or postalCode, validate the
  // *effective* combination (incoming value if provided, otherwise the stored
  // value).  A Zod refinement cannot do this because it has no DB access.
  const changingZoneField = data.city !== undefined || data.postalCode !== undefined
  if (changingZoneField) {
    const effectiveCity = data.city !== undefined ? data.city : existing.city
    const effectivePostalCode = data.postalCode !== undefined ? data.postalCode : existing.postalCode
    if (!isInDeliveryZone(effectiveCity, effectivePostalCode)) {
      throw httpError(
        422,
        'Delivery is only available in Mataró (postal codes 08301–08304)',
      )
    }
  }

  // Build update payload — only include fields that are present in data
  const updateData = {}
  if (data.label !== undefined) updateData.label = data.label
  if (data.street !== undefined) updateData.street = data.street
  if (data.number !== undefined) updateData.number = data.number
  if (data.floorDoor !== undefined) updateData.floorDoor = data.floorDoor
  if (data.postalCode !== undefined) updateData.postalCode = data.postalCode
  if (data.city !== undefined) updateData.city = data.city
  if (data.notes !== undefined) updateData.notes = data.notes

  return prisma.address.update({
    where: { id: addressId },
    data: updateData,
    select: ADDRESS_SELECT,
  })
}

/**
 * Soft-deletes an address by setting deletedAt = now().
 * Historical orders that reference this address via FK keep working
 * because the deliveryAddress snapshot is stored as text in Order.
 *
 * Throws 404 if not found / already deleted.
 * Throws 404 (not 403) if belongs to a different user (avoids info leak).
 *
 * @param {string} userId
 * @param {string} addressId
 * @returns {Promise<void>}
 */
export async function softDeleteAddress(userId, addressId) {
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
    select: { id: true, userId: true, deletedAt: true },
  })

  if (!existing || existing.deletedAt !== null) {
    throw httpError(404, 'Address not found')
  }
  if (existing.userId !== userId) {
    throw httpError(404, 'Address not found')
  }

  await prisma.address.update({
    where: { id: addressId },
    data: { deletedAt: new Date() },
  })
}

/**
 * Soft-deletes ALL active addresses for a user.
 * Called by authService.deleteAccount during RGPD account erasure.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function softDeleteAllUserAddresses(userId) {
  await prisma.address.updateMany({
    where: { userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
}

/**
 * Resolves an address by ID, verifying ownership.
 * Used by orderService when creating a DELIVERY order:
 *   - Returns the full address row (including snapshot-building fields).
 *   - Throws 400 if not found, soft-deleted, or belongs to a different user.
 *
 * @param {string} userId
 * @param {string} addressId
 * @returns {Promise<Address>}
 */
export async function resolveAddressForOrder(userId, addressId) {
  const addr = await prisma.address.findUnique({
    where: { id: addressId },
    select: {
      id: true,
      userId: true,
      label: true,
      street: true,
      number: true,
      floorDoor: true,
      postalCode: true,
      city: true,
      notes: true,
      deletedAt: true,
    },
  })

  if (!addr || addr.deletedAt !== null) {
    throw httpError(400, 'The selected delivery address was not found. Please add a valid address first.')
  }
  if (addr.userId !== userId) {
    // 400 not 403: don't reveal existence of addresses belonging to other users
    throw httpError(400, 'The selected delivery address was not found. Please add a valid address first.')
  }

  return addr
}
