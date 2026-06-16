import { describe, it, expect } from '@jest/globals'
import { updateOrderStatusSchema, createProductSchema, updateProductSchema, createBlacklistEntrySchema } from '../../src/validators/admin.js'

describe('updateOrderStatusSchema', () => {
  const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

  it.each(validStatuses)('accepts status %s', (status) => {
    expect(() => updateOrderStatusSchema.parse({ status })).not.toThrow()
  })

  it('rejects unknown status', () => {
    expect(() => updateOrderStatusSchema.parse({ status: 'SHIPPED' })).toThrow()
  })

  it('accepts optional note', () => {
    expect(() => updateOrderStatusSchema.parse({ status: 'CONFIRMED', note: 'Ready soon' })).not.toThrow()
  })

  it('rejects note longer than 500 chars', () => {
    expect(() => updateOrderStatusSchema.parse({ status: 'CONFIRMED', note: 'a'.repeat(501) })).toThrow()
  })
})

describe('createProductSchema', () => {
  const valid = {
    categoryId: 'cat-1',
    name: 'Bocadillo de jamón',
    price: 5.50,
    available: true,
  }

  it('accepts a valid product', () => {
    expect(() => createProductSchema.parse(valid)).not.toThrow()
  })

  it('rejects missing categoryId', () => {
    const { categoryId, ...rest } = valid
    expect(() => createProductSchema.parse(rest)).toThrow()
  })

  it('rejects missing name', () => {
    const { name, ...rest } = valid
    expect(() => createProductSchema.parse(rest)).toThrow()
  })

  it('rejects price = 0', () => {
    expect(() => createProductSchema.parse({ ...valid, price: 0 })).toThrow()
  })

  it('rejects price > 999.99', () => {
    expect(() => createProductSchema.parse({ ...valid, price: 1000 })).toThrow()
  })

  it('accepts allergenIds array', () => {
    expect(() => createProductSchema.parse({ ...valid, allergenIds: ['allergen-1', 'allergen-2'] })).not.toThrow()
  })

  it('defaults available to true', () => {
    const { available, ...rest } = valid
    const parsed = createProductSchema.parse(rest)
    expect(parsed.available).toBe(true)
  })
})

describe('updateProductSchema', () => {
  it('accepts a partial update (name only)', () => {
    expect(() => updateProductSchema.parse({ name: 'New name' })).not.toThrow()
  })

  it('accepts empty object (all fields optional)', () => {
    expect(() => updateProductSchema.parse({})).not.toThrow()
  })

  it('rejects invalid price in partial update', () => {
    expect(() => updateProductSchema.parse({ price: -1 })).toThrow()
  })
})

describe('createBlacklistEntrySchema', () => {
  const valid = {
    type: 'phone',
    value: '+34612345678',
    reason: 'Fraud attempt',
  }

  it('accepts a valid entry', () => {
    expect(() => createBlacklistEntrySchema.parse(valid)).not.toThrow()
  })

  it.each(['phone', 'address', 'email', 'ip'])('accepts type %s', (type) => {
    expect(() => createBlacklistEntrySchema.parse({ ...valid, type })).not.toThrow()
  })

  it('rejects unknown type', () => {
    expect(() => createBlacklistEntrySchema.parse({ ...valid, type: 'mac_address' })).toThrow()
  })

  it('rejects missing reason', () => {
    const { reason, ...rest } = valid
    expect(() => createBlacklistEntrySchema.parse(rest)).toThrow()
  })

  it('accepts optional expiresAt as ISO datetime', () => {
    expect(() => createBlacklistEntrySchema.parse({ ...valid, expiresAt: new Date(Date.now() + 86400000).toISOString() })).not.toThrow()
  })

  it('rejects expiresAt with non-datetime string', () => {
    expect(() => createBlacklistEntrySchema.parse({ ...valid, expiresAt: '2026-12-31' })).toThrow()
  })
})
