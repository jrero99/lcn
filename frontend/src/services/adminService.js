// adminService.js — service layer for admin API endpoints.
//
// All requests use `credentials: 'include'` so the browser sends the httpOnly
// JWT cookie automatically. Server-side `requireAdmin` middleware validates the
// role on every request — UI gating here is UX only, not security.
//
// RGPD note: user data returned by these endpoints (email, addresses, phone)
// must NOT be logged to the console.

import { notifyUnauthorized } from './sessionEvents.js'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

// ── Internal helper ────────────────────────────────────────────────────────────

async function adminFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    // A 401 from any admin endpoint means the session has expired or the cookie
    // is no longer valid. Signal AuthContext to clear the user state.
    if (res.status === 401) notifyUnauthorized()

    let msg = `Admin API error ${res.status}`
    try {
      const data = await res.json()
      if (data?.message) msg = data.message
      if (data?.error) msg = data.error
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  // 204 No Content — no body to parse
  if (res.status === 204) return null

  return res.json()
}

// ── Orders ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/orders
 * @param {{ status?: string, page?: number, limit?: number }} params
 */
export async function fetchAdminOrders({ status = '', page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  qs.set('page', String(page))
  qs.set('limit', String(limit))
  return adminFetch(`/api/admin/orders?${qs}`)
}

/**
 * PATCH /api/admin/orders/:id
 * @param {string} id
 * @param {{ status: string, note?: string }} body
 */
export async function updateOrderStatus(id, body) {
  return adminFetch(`/api/admin/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

// ── Catalog ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/catalog
 * Returns categories + products including unavailable ones.
 */
export async function fetchAdminCatalog() {
  return adminFetch('/api/admin/catalog')
}

/**
 * POST /api/admin/catalog/products
 * @param {{ categoryId, name, description?, price, available?, allergenIds? }} body
 */
export async function createProduct(body) {
  return adminFetch('/api/admin/catalog/products', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * PATCH /api/admin/catalog/products/:id
 * @param {string} id
 * @param {object} body  — partial product fields
 */
export async function updateProduct(id, body) {
  return adminFetch(`/api/admin/catalog/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/**
 * DELETE /api/admin/catalog/products/:id
 * @param {string} id
 */
export async function deleteProduct(id) {
  return adminFetch(`/api/admin/catalog/products/${id}`, {
    method: 'DELETE',
  })
}

// ── Users ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Returns CUSTOMER users (excludes soft-deleted).
 * @param {{ page?: number, limit?: number }} params
 */
export async function fetchAdminUsers({ page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  return adminFetch(`/api/admin/users?${qs}`)
}

/**
 * GET /api/admin/users/:id/addresses
 * RGPD: do not log the result.
 * @param {string} userId
 */
export async function fetchUserAddresses(userId) {
  return adminFetch(`/api/admin/users/${userId}/addresses`)
}

// ── Blacklist ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/blacklist
 */
export async function fetchBlacklist() {
  return adminFetch('/api/admin/blacklist')
}

/**
 * POST /api/admin/blacklist
 * @param {{ type: 'phone'|'address'|'email'|'ip', value: string, reason: string, expiresAt?: string }} body
 */
export async function addBlacklistEntry(body) {
  return adminFetch('/api/admin/blacklist', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * DELETE /api/admin/blacklist/:id
 * @param {string} id
 */
export async function deleteBlacklistEntry(id) {
  return adminFetch(`/api/admin/blacklist/${id}`, {
    method: 'DELETE',
  })
}
