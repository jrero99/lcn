// orderService.js — service layer for POST /api/orders.
//
// The backend recalculates the total server-side; the frontend sends items
// with quantities and selected options but never a trusted total.
//
// Field mapping (frontend UI values → backend enum values):
//   mode:    'recoger'  → 'PICKUP'
//            'domicilio' → 'DELIVERY'
//   timing:  'asap'     → 'ASAP'
//            'programar' → 'SCHEDULED'
//   paymentMethod: passed through as-is (must be 'CARD' | 'CASH')
//
// DELIVERY orders must include `addressId` (UUID of a saved address).
// PICKUP orders must NOT include `addressId`.
//
// `idempotencyKey`: caller must generate a UUID v4 once per order attempt and
// reuse the same key on network-error retries (so the server deduplicates).
// Use crypto.randomUUID() — available in all modern browsers and Node ≥ 14.19.

import { notifyUnauthorized } from './sessionEvents.js'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

/**
 * Maps UI mode values to the backend enum expected by the validator.
 * @param {'recoger'|'domicilio'} uiMode
 * @returns {'PICKUP'|'DELIVERY'}
 */
function mapMode(uiMode) {
  return uiMode === 'domicilio' ? 'DELIVERY' : 'PICKUP'
}

/**
 * Maps UI timing values to the backend enum expected by the validator.
 * @param {'asap'|'programar'} uiTiming
 * @returns {'ASAP'|'SCHEDULED'}
 */
function mapTiming(uiTiming) {
  return uiTiming === 'programar' ? 'SCHEDULED' : 'ASAP'
}

/**
 * POST /api/orders
 *
 * Sends a new order to the backend. The server recalculates the total and
 * verifies stock, address ownership, blacklist, etc. Returns the created
 * order id and optional custom confirmation copy.
 *
 * @param {{
 *   idempotencyKey: string        — UUID v4; reuse on retries
 *   mode: 'recoger'|'domicilio'
 *   paymentMethod: 'CARD'|'CASH'
 *   timing: 'asap'|'programar'
 *   scheduledFor?: string         — ISO 8601, required when timing=programar
 *   contactPhone: string          — valid Spanish phone, e.g. "+34612345678"
 *   items: Array<{
 *     productId: string
 *     quantity: number
 *     selectedOptions?: Record<groupId, choiceId>
 *     removedIngredients?: string[]
 *     notes?: string
 *   }>
 *   addressId?: string            — UUID, required for mode=domicilio
 *   notes?: string                — order-level notes (max 500)
 * }} payload
 *
 * @returns {Promise<{
 *   orderId: string,
 *   confirmationTitle?: string,
 *   confirmationMessage?: string,
 * }>}
 * @throws {Error} with a user-friendly message for known error codes
 */
export async function createOrder(payload) {
  const {
    idempotencyKey,
    mode,
    paymentMethod,
    timing,
    scheduledFor,
    contactPhone,
    items,
    addressId,
    notes,
  } = payload

  // Build the body using the exact field names the validator expects.
  // Map UI enum values to backend enum values.
  const body = {
    idempotencyKey,
    mode: mapMode(mode),
    paymentMethod,
    timing: mapTiming(timing),
    contactPhone,
    items: items.map((it) => {
      const line = {
        productId: it.productId,
        quantity: it.quantity,
      }
      if (it.selectedOptions && Object.keys(it.selectedOptions).length > 0) {
        line.selectedOptions = it.selectedOptions
      }
      if (it.removedIngredients && it.removedIngredients.length > 0) {
        line.removedIngredients = it.removedIngredients
      }
      if (it.notes) {
        line.notes = it.notes
      }
      return line
    }),
  }

  // Only include addressId for DELIVERY; omit entirely for PICKUP.
  if (mapMode(mode) === 'DELIVERY' && addressId) {
    body.addressId = addressId
  }

  // Only include scheduledFor when timing is SCHEDULED.
  if (mapTiming(timing) === 'SCHEDULED' && scheduledFor) {
    body.scheduledFor = scheduledFor
  }

  // Order-level notes (optional).
  if (notes) body.notes = notes

  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let serverMsg
    try {
      const resBody = await res.json()
      serverMsg = resBody?.error || resBody?.message
      if (resBody?.issues?.length > 0) serverMsg = resBody.issues[0]?.message
    } catch { /* ignore */ }

    let msg
    switch (res.status) {
      case 401:
        notifyUnauthorized()
        msg = 'Tu sesión ha expirado. Inicia sesión de nuevo para confirmar el pedido.'
        break
      case 403:
        msg = 'No hemos podido procesar el pedido. Si crees que es un error, contáctanos.'
        break
      case 422:
        msg = serverMsg || 'Hay un problema con los datos del pedido. Revísalos e inténtalo de nuevo.'
        break
      case 429:
        msg = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
        break
      default:
        msg = serverMsg || `No se ha podido enviar el pedido (${res.status}). Inténtalo de nuevo.`
    }
    throw new Error(msg)
  }

  return res.json()
}
