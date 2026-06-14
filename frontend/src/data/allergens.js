// allergens.js — display labels for the 14 EU mandatory allergens.
//
// The backend (GET /api/catalog) returns allergens as normalized names
// (e.g. 'lacteos', 'frutos-de-cascara', 'sesamo'). This maps each to a
// human-readable Spanish label for the UI. Unknown names fall back to a
// capitalized version of the raw value so nothing is ever hidden.

const ALLERGEN_LABELS = {
  gluten: 'Gluten',
  crustaceos: 'Crustáceos',
  huevos: 'Huevos',
  pescado: 'Pescado',
  cacahuetes: 'Cacahuetes',
  soja: 'Soja',
  lacteos: 'Lácteos',
  'frutos-de-cascara': 'Frutos de cáscara',
  apio: 'Apio',
  mostaza: 'Mostaza',
  sesamo: 'Sésamo',
  sulfitos: 'Sulfitos',
  altramuces: 'Altramuces',
  moluscos: 'Moluscos',
}

/** Returns the display label for a single allergen name. */
export function allergenLabel(name) {
  if (ALLERGEN_LABELS[name]) return ALLERGEN_LABELS[name]
  // Fallback: capitalize the raw value (also handles legacy mock values).
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** Formats a list of allergen names into a readable, comma-separated string. */
export function formatAllergens(names) {
  return names.map(allergenLabel).join(', ')
}
