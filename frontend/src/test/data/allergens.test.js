// allergens.test.js — unit tests for allergen display utilities.
import { allergenLabel, formatAllergens } from '../../data/allergens.js'

describe('allergenLabel', () => {
  test('returns Spanish label for known allergens', () => {
    expect(allergenLabel('gluten')).toBe('Gluten')
    expect(allergenLabel('lacteos')).toBe('Lácteos')
    expect(allergenLabel('frutos-de-cascara')).toBe('Frutos de cáscara')
    expect(allergenLabel('sesamo')).toBe('Sésamo')
  })

  test('capitalizes unknown allergens as fallback', () => {
    expect(allergenLabel('unknown-thing')).toBe('Unknown-thing')
  })

  test('handles all 14 EU mandatory allergens', () => {
    const known = [
      'gluten', 'crustaceos', 'huevos', 'pescado', 'cacahuetes',
      'soja', 'lacteos', 'frutos-de-cascara', 'apio', 'mostaza',
      'sesamo', 'sulfitos', 'altramuces', 'moluscos',
    ]
    known.forEach((name) => {
      expect(allergenLabel(name)).not.toBe(name) // should be mapped, not raw
    })
  })
})

describe('formatAllergens', () => {
  test('formats a list of allergens as comma-separated string', () => {
    expect(formatAllergens(['gluten', 'lacteos'])).toBe('Gluten, Lácteos')
  })

  test('returns empty string for empty array', () => {
    expect(formatAllergens([])).toBe('')
  })

  test('returns single allergen without comma', () => {
    expect(formatAllergens(['huevos'])).toBe('Huevos')
  })
})
