// addressService.js — service layer for /api/addresses endpoints.
//
// All requests use `credentials: 'include'` so the browser sends the httpOnly
// JWT cookie automatically. All endpoints require auth (401 if not logged in).
//
// Address shape (from server):
// {
//   id: string (uuid)
//   label?: string         — "Casa", "Trabajo"
//   street: string
//   number: string
//   floorDoor?: string     — "3r 2a"
//   postalCode: string     — 5 digits
//   city: string
//   notes?: string
//   createdAt: string      — ISO 8601
// }

import { notifyUnauthorized } from './sessionEvents.js'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

/**
 * GET /api/addresses
 * Fetches all active addresses for the authenticated user.
 * @returns {Promise<{ addresses: Address[] }>}
 * @throws {Error} if not authenticated (401) or server error
 */
export async function getAddresses() {
  const res = await fetch(`${API_BASE_URL}/api/addresses`, {
    method: 'GET',
    credentials: 'include',
  })

  if (res.status === 401) {
    notifyUnauthorized()
    throw new Error('Necesitas iniciar sesión para ver tus direcciones.')
  }
  if (!res.ok) {
    throw new Error(`No se han podido cargar las direcciones (${res.status}).`)
  }

  return res.json()
}

/**
 * POST /api/addresses
 * Creates a new address for the authenticated user.
 * @param {{
 *   label?: string,
 *   street: string,
 *   number: string,
 *   floorDoor?: string,
 *   postalCode: string,
 *   city: string,
 *   notes?: string
 * }} data
 * @returns {Promise<{ address: Address }>}
 * @throws {Error} with a user-friendly message for 422/429/401
 */
export async function createAddress(data) {
  const res = await fetch(`${API_BASE_URL}/api/addresses`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    let serverMsg
    try {
      const body = await res.json()
      serverMsg = body?.error || body?.message
      // Zod issues array — extract first message
      if (body?.issues?.length > 0) serverMsg = body.issues[0]?.message
    } catch { /* ignore */ }

    let msg
    switch (res.status) {
      case 401:
        notifyUnauthorized()
        msg = 'Necesitas iniciar sesión para guardar una dirección.'
        break
      case 422:
        msg = serverMsg || 'Revisa los datos de la dirección. La ciudad debe estar en Mataró (CP 08301-08304).'
        break
      case 429:
        msg = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
        break
      default:
        msg = serverMsg || `No se ha podido guardar la dirección (${res.status}).`
    }
    throw new Error(msg)
  }

  return res.json()
}

/**
 * PATCH /api/addresses/:id
 * Updates one or more fields of an existing address.
 * @param {string} id  Address UUID
 * @param {Partial<Address>} data  At least one field required
 * @returns {Promise<{ address: Address }>}
 * @throws {Error} with a user-friendly message
 */
export async function updateAddress(id, data) {
  const res = await fetch(`${API_BASE_URL}/api/addresses/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    let serverMsg
    try {
      const body = await res.json()
      serverMsg = body?.error || body?.message
      if (body?.issues?.length > 0) serverMsg = body.issues[0]?.message
    } catch { /* ignore */ }

    let msg
    switch (res.status) {
      case 401:
        notifyUnauthorized()
        msg = 'Necesitas iniciar sesión para editar una dirección.'
        break
      case 404:
        msg = 'Dirección no encontrada.'
        break
      case 422:
        msg = serverMsg || 'Revisa los datos de la dirección.'
        break
      case 429:
        msg = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
        break
      default:
        msg = serverMsg || `No se ha podido actualizar la dirección (${res.status}).`
    }
    throw new Error(msg)
  }

  return res.json()
}

/**
 * DELETE /api/addresses/:id
 * Soft-deletes an address. Returns 204 (no body).
 * @param {string} id  Address UUID
 * @returns {Promise<void>}
 * @throws {Error} with a user-friendly message
 */
export async function deleteAddress(id) {
  const res = await fetch(`${API_BASE_URL}/api/addresses/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (res.status === 204) return // success

  let serverMsg
  try {
    const body = await res.json()
    serverMsg = body?.error || body?.message
  } catch { /* ignore */ }

  let msg
  switch (res.status) {
    case 401:
      notifyUnauthorized()
      msg = 'Necesitas iniciar sesión para eliminar una dirección.'
      break
    case 404:
      msg = 'Dirección no encontrada.'
      break
    case 429:
      msg = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
      break
    default:
      msg = serverMsg || `No se ha podido eliminar la dirección (${res.status}).`
  }
  throw new Error(msg)
}

/**
 * Format an address object as a single human-readable string.
 * Used in selectors, checkout bars, etc.
 * @param {Address} address
 * @returns {string}
 */
export function formatAddress(address) {
  const parts = [
    `${address.street}, ${address.number}`,
    address.floorDoor,
    `${address.postalCode} ${address.city}`,
  ].filter(Boolean)
  return parts.join(', ')
}
