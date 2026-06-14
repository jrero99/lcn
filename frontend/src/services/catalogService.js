// catalogService.js — service layer for catalog data.
//
// Fetches the catalog from the backend (GET /api/catalog). This is the ONLY
// file that talks to the catalog endpoint; OrderCatalog.jsx, Carta.jsx and any
// other consumer call fetchCatalog() and stay unaware of the transport.

// Base URL for the backend API.
// Set VITE_API_URL in frontend/.env.local (e.g. VITE_API_URL=http://localhost:3001).
// When the variable is absent we fall back to an empty string so that relative
// paths work in production (frontend and backend served from the same origin).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

/**
 * Fetches the full product catalog (all categories with their products).
 *
 * @returns {Promise<Array>} Resolves to an array of category objects.
 *   Each category: { id, slug, label, heading, products[] }
 *   Each product:  { id, name, description, price, allergens[], options[]? }
 *   Each option:   { id, label, type, choices: [{ id, label, priceExtra }] }
 *
 * @throws {Error} If the network request fails or the server returns a
 *   non-OK HTTP status. Consumers handle this with an error + retry state.
 */
export async function fetchCatalog() {
  const res = await fetch(`${API_BASE_URL}/api/catalog`)

  if (!res.ok) {
    throw new Error(
      `Failed to fetch catalog: ${res.status} ${res.statusText}`
    )
  }

  return res.json()
}
