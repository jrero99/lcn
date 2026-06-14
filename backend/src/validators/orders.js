import { z } from 'zod'
import { isValidPhoneNumber } from 'libphonenumber-js'

const MATARO_POSTAL_CODES = ['08301', '08302', '08303', '08304']

const spanishPhone = z.string().superRefine((val, ctx) => {
  if (!isValidPhoneNumber(val.trim(), 'ES')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must be a valid Spanish phone number',
    })
  }
})

const addressSchema = z
  .object({
    street: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().regex(/^\d{5}$/, 'Invalid postal code'),
    province: z.string().trim().max(100).optional(),
    country: z.string().trim().length(2).optional(),
  })
  .superRefine((val, ctx) => {
    const cityLower = val.city.toLowerCase()
    const validCity =
      cityLower.includes('mataró') || cityLower.includes('mataro')
    const validPostal = MATARO_POSTAL_CODES.includes(val.postalCode)
    if (!validCity && !validPostal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Delivery is only available in Mataró (postal codes 08301-08304)',
        path: ['postalCode'],
      })
    }
  })

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  selectedOptions: z.record(z.string(), z.string()).optional(),
  removedIngredients: z.array(z.string().max(100)).max(20).optional(),
  notes: z.string().trim().max(300).optional(),
})

export const createOrderSchema = z
  .object({
    idempotencyKey: z.string().uuid('idempotencyKey must be a UUID v4'),
    mode: z.enum(['PICKUP', 'DELIVERY']),
    paymentMethod: z.enum(['CARD', 'CASH']),
    timing: z.enum(['ASAP', 'SCHEDULED']).default('ASAP'),
    scheduledFor: z.string().datetime().optional(),
    contactPhone: spanishPhone,
    items: z.array(orderItemSchema).min(1).max(50),
    address: addressSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    // Honeypot — must be absent or empty
    _honey: z.string().max(0).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === 'DELIVERY' && !val.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'address is required for DELIVERY orders',
        path: ['address'],
      })
    }
    if (val.timing === 'SCHEDULED' && !val.scheduledFor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduledFor is required when timing is SCHEDULED',
        path: ['scheduledFor'],
      })
    }
  })
