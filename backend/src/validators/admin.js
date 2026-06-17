import { z } from 'zod'

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
})

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const createProductSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  price: z.number().positive().max(999.99),
  available: z.boolean().default(true),
  allergenIds: z.array(z.string().min(1)).optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const createBlacklistEntrySchema = z.object({
  type: z.enum(['phone', 'address', 'email', 'ip']),
  value: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(1).max(500),
  // expiresAt defaults to 1 year from now if not provided
  expiresAt: z.string().datetime().optional(),
})
