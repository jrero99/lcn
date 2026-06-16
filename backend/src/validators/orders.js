import { z } from 'zod'
import { isValidPhoneNumber } from 'libphonenumber-js'

const spanishPhone = z.string().superRefine((val, ctx) => {
  if (!isValidPhoneNumber(val.trim(), 'ES')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must be a valid Spanish phone number',
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
    // For DELIVERY orders, the client must send an addressId (UUID) that
    // belongs to their account. The server resolves the address, copies it
    // as a snapshot to Order.deliveryAddress, and stores the FK in addressId.
    // Inline address objects are no longer accepted — addresses must be
    // created first via POST /api/addresses.
    addressId: z.string().uuid('addressId must be a UUID').optional(),
    notes: z.string().trim().max(500).optional(),
    // Honeypot — must be absent or empty
    _honey: z.string().max(0).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === 'DELIVERY' && !val.addressId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'addressId is required for DELIVERY orders. Create an address via POST /api/addresses first.',
        path: ['addressId'],
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
