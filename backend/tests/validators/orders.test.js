import { describe, it, expect } from '@jest/globals'
import { createOrderSchema } from '../../src/validators/orders.js'

const validBase = {
  idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
  mode: 'PICKUP',
  paymentMethod: 'CASH',
  timing: 'ASAP',
  contactPhone: '612345678',
  items: [{ productId: 'prod-1', quantity: 2 }],
}

describe('createOrderSchema', () => {
  it('accepts a valid PICKUP order', () => {
    expect(() => createOrderSchema.parse(validBase)).not.toThrow()
  })

  it('accepts a valid DELIVERY order with addressId', () => {
    expect(() => createOrderSchema.parse({
      ...validBase,
      mode: 'DELIVERY',
      addressId: '550e8400-e29b-41d4-a716-446655440001',
    })).not.toThrow()
  })

  it('rejects DELIVERY without addressId', () => {
    const result = (() => {
      try { createOrderSchema.parse({ ...validBase, mode: 'DELIVERY' }) }
      catch (e) { return e }
    })()
    expect(result).toBeDefined()
    const issue = result.issues?.find(i => i.path.includes('addressId'))
    expect(issue).toBeDefined()
  })

  it('rejects SCHEDULED timing without scheduledFor', () => {
    const result = (() => {
      try { createOrderSchema.parse({ ...validBase, timing: 'SCHEDULED' }) }
      catch (e) { return e }
    })()
    expect(result).toBeDefined()
    const issue = result.issues?.find(i => i.path.includes('scheduledFor'))
    expect(issue).toBeDefined()
  })

  it('accepts SCHEDULED with a valid scheduledFor', () => {
    const future = new Date(Date.now() + 3600000).toISOString()
    expect(() => createOrderSchema.parse({ ...validBase, timing: 'SCHEDULED', scheduledFor: future })).not.toThrow()
  })

  it('rejects invalid idempotencyKey (not UUID)', () => {
    expect(() => createOrderSchema.parse({ ...validBase, idempotencyKey: 'not-a-uuid' })).toThrow()
  })

  it('rejects invalid addressId (not UUID)', () => {
    expect(() => createOrderSchema.parse({ ...validBase, mode: 'DELIVERY', addressId: 'not-a-uuid' })).toThrow()
  })

  it('rejects empty items array', () => {
    expect(() => createOrderSchema.parse({ ...validBase, items: [] })).toThrow()
  })

  it('rejects items with quantity 0', () => {
    expect(() => createOrderSchema.parse({ ...validBase, items: [{ productId: 'p', quantity: 0 }] })).toThrow()
  })

  it('rejects items with quantity > 99', () => {
    expect(() => createOrderSchema.parse({ ...validBase, items: [{ productId: 'p', quantity: 100 }] })).toThrow()
  })

  it('rejects invalid paymentMethod', () => {
    expect(() => createOrderSchema.parse({ ...validBase, paymentMethod: 'BITCOIN' })).toThrow()
  })

  it('rejects invalid mode', () => {
    expect(() => createOrderSchema.parse({ ...validBase, mode: 'DRIVE_THROUGH' })).toThrow()
  })

  it('rejects invalid Spanish contactPhone', () => {
    expect(() => createOrderSchema.parse({ ...validBase, contactPhone: '123' })).toThrow()
  })

  it('blocks honeypot when filled', () => {
    expect(() => createOrderSchema.parse({ ...validBase, _honey: 'bot' })).toThrow()
  })

  it('accepts notes up to 500 chars', () => {
    expect(() => createOrderSchema.parse({ ...validBase, notes: 'a'.repeat(500) })).not.toThrow()
  })

  it('rejects notes longer than 500 chars', () => {
    expect(() => createOrderSchema.parse({ ...validBase, notes: 'a'.repeat(501) })).toThrow()
  })

  it('defaults timing to ASAP when omitted', () => {
    const { timing, ...rest } = validBase
    const parsed = createOrderSchema.parse(rest)
    expect(parsed.timing).toBe('ASAP')
  })

  it('accepts items with selectedOptions', () => {
    const item = { productId: 'p1', quantity: 1, selectedOptions: { 'group-1': 'choice-a' } }
    expect(() => createOrderSchema.parse({ ...validBase, items: [item] })).not.toThrow()
  })

  it('accepts items with removedIngredients array', () => {
    const item = { productId: 'p1', quantity: 1, removedIngredients: ['tomato', 'onion'] }
    expect(() => createOrderSchema.parse({ ...validBase, items: [item] })).not.toThrow()
  })
})
