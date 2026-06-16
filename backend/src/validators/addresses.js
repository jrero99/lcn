// ============================================================
// Validator — CRUD de direcciones (Address)
//
// Todos los endpoints de /api/addresses requieren auth.
// La validación de zona de reparto (Mataró / CP 08301-08304)
// se aplica aquí, no como constraint de BD.
// ============================================================

import { z } from 'zod'

// Codigos postales de reparto admitidos
const MATARO_POSTAL_CODES = ['08301', '08302', '08303', '08304']

// ── Campos reutilizables ──────────────────────────────────────

const labelField = z
  .string()
  .trim()
  .max(50, 'label must be 50 characters or fewer')
  .optional()

const streetField = z
  .string()
  .trim()
  .min(3, 'street must be at least 3 characters')
  .max(200, 'street must be 200 characters or fewer')

const numberField = z
  .string()
  .trim()
  .min(1, 'number is required')
  .max(10, 'number must be 10 characters or fewer')

const floorDoorField = z
  .string()
  .trim()
  .max(50, 'floorDoor must be 50 characters or fewer')
  .optional()

const postalCodeField = z
  .string()
  .trim()
  .regex(/^\d{5}$/, 'postalCode must be a 5-digit number')

const cityField = z
  .string()
  .trim()
  .min(2, 'city must be at least 2 characters')
  .max(100, 'city must be 100 characters or fewer')

const notesField = z
  .string()
  .trim()
  .max(300, 'notes must be 300 characters or fewer')
  .optional()

// ── Refinement: la direccion debe estar en la zona de reparto ──

/**
 * Verifica que city contenga "Mataró"/"Mataro" o que postalCode
 * sea uno de los códigos postales de reparto.
 * Se aplica después de parsear los campos individuales.
 */
function refineDeliveryZone(data, ctx) {
  const cityLower = (data.city ?? '').toLowerCase()
  const validCity = cityLower.includes('mataró') || cityLower.includes('mataro')
  const validPostal = MATARO_POSTAL_CODES.includes(data.postalCode ?? '')

  if (!validCity && !validPostal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Delivery is only available in Mataró (postal codes 08301–08304)',
      path: ['postalCode'],
    })
  }
}

// ── Schema: POST /api/addresses ───────────────────────────────

export const createAddressSchema = z
  .object({
    label: labelField,
    street: streetField,
    number: numberField,
    floorDoor: floorDoorField,
    postalCode: postalCodeField,
    city: cityField,
    notes: notesField,
  })
  .superRefine(refineDeliveryZone)

// ── Schema: PATCH /api/addresses/:id ─────────────────────────
// Todos los campos son opcionales; al menos uno debe estar presente.
// Sigue siendo necesaria la validación de zona si se cambia city o postalCode.

const patchRawSchema = z
  .object({
    label: labelField,
    street: streetField.optional(),
    number: numberField.optional(),
    floorDoor: floorDoorField,
    postalCode: postalCodeField.optional(),
    city: cityField.optional(),
    notes: notesField,
  })

export const updateAddressSchema = patchRawSchema
  .superRefine((data, ctx) => {
    // Rechazar body vacío (ningún campo presente)
    const hasAny = Object.values(data).some((v) => v !== undefined)
    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided to update an address',
        path: [],
      })
    }
  })
// NOTE: delivery-zone validation for PATCH is intentionally NOT done here.
// A partial update may send only city or only postalCode; the refinement
// cannot know the other field's current value in the DB.
// The combined check (effectiveCity + effectivePostalCode) is performed in
// addressService.updateAddress(), where the existing row is already fetched.
