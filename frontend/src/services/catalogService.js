// catalogService.js — service layer for catalog data.
//
// TODAY: returns mock data resolved as a Promise (simulates async).
// FUTURE: swap the body of fetchCatalog() to call GET /api/catalog.
//
// When the backend exists, the ONLY file you need to touch is this one.
// OrderCatalog.jsx and every other consumer stay unchanged.

import { CATEGORIES } from '../data/catalogMockData.js'

// Base URL for the backend API.
// Set VITE_API_URL in a local .env file (e.g. VITE_API_URL=http://localhost:3001).
// When the variable is absent we fall back to an empty string so that relative
// paths work in production (frontend and backend served from the same origin).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

/**
 * Fetches the full product catalog (all categories with their products).
 *
 * @returns {Promise<Array>} Resolves to an array of category objects.
 *   Each category: { id, label, heading, products[] }
 *   Each product:  { id, name, description, price, allergens[], options[]? }
 *   See catalogMockData.js for the exact shape, including the `options` field.
 *
 * @throws Will throw (reject) if the network request fails or the server
 *   returns a non-OK HTTP status.
 */
export async function fetchCatalog() {
  // TODO: replace the mock below with the real fetch once GET /api/catalog exists.
  //
  // Example of the real implementation (uncomment and delete the mock return):
  //
  //   const res = await fetch(`${API_BASE_URL}/api/catalog`)
  //   if (!res.ok) {
  //     throw new Error(`Failed to fetch catalog: ${res.status} ${res.statusText}`)
  //   }
  //   return res.json()
  //
  // The response shape must match the mock: an array of category objects,
  // each with a `products` array. Every product that supports customisation
  // must include an `options` field (see catalogMockData.js for the exact shape).
  // Coordinate with backend-node before implementing.
  //
  // Note: API_BASE_URL is defined at the top of this file via VITE_API_URL.

  // --- MOCK (temporary) ---
  // Simulate a network round-trip so the component handles async correctly.
  return Promise.resolve(CATEGORIES)
}
