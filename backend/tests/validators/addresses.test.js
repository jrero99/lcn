import { describe, it, expect } from '@jest/globals'
import { createAddressSchema, updateAddressSchema } from '../../src/validators/addresses.js'

const validCreate = {
  label: 'Casa',
  street: 'Carrer de Barcelona',
  number: '12',
  floorDoor: '3r 2a',
  postalCode: '08302',
  city: 'Mataró',
  notes: 'Portero 2B',
}

describe('createAddressSchema', () => {
  it('accepts a fully valid payload', () => {
    expect(() => createAddressSchema.parse(validCreate)).not.toThrow()
  })

  it('accepts without optional fields (label, floorDoor, notes)', () => {
    const { label, floorDoor, notes, ...rest } = validCreate
    expect(() => createAddressSchema.parse(rest)).not.toThrow()
  })

  it('rejects missing street', () => {
    const { street, ...rest } = validCreate
    expect(() => createAddressSchema.parse(rest)).toThrow()
  })

  it('rejects missing number', () => {
    const { number, ...rest } = validCreate
    expect(() => createAddressSchema.parse(rest)).toThrow()
  })

  it('rejects missing postalCode', () => {
    const { postalCode, ...rest } = validCreate
    expect(() => createAddressSchema.parse(rest)).toThrow()
  })

  it('rejects missing city', () => {
    const { city, ...rest } = validCreate
    expect(() => createAddressSchema.parse(rest)).toThrow()
  })

  it('rejects postalCode with non-digits', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, postalCode: '0830A' })).toThrow()
  })

  it('rejects postalCode with 4 digits', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, postalCode: '0830' })).toThrow()
  })

  it('rejects postalCode with 6 digits', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, postalCode: '083021' })).toThrow()
  })

  // Delivery zone checks
  it('accepts CP 08301 with any city', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, postalCode: '08301', city: 'Barcelona' })).not.toThrow()
  })

  it('accepts CP 08302', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, postalCode: '08302' })).not.toThrow()
  })

  it('accepts CP 08303', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, postalCode: '08303' })).not.toThrow()
  })

  it('accepts CP 08304', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, postalCode: '08304' })).not.toThrow()
  })

  it('accepts city "mataro" (no accent) with out-of-zone CP', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, postalCode: '28001', city: 'mataro' })).not.toThrow()
  })

  it('rejects CP 28001 with city Barcelona (out of zone)', () => {
    const result = (() => {
      try { createAddressSchema.parse({ ...validCreate, postalCode: '28001', city: 'Barcelona' }) }
      catch (e) { return e }
    })()
    expect(result).toBeDefined()
    expect(result.issues?.some(i => i.path.includes('postalCode'))).toBe(true)
  })

  it('rejects street shorter than 3 chars', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, street: 'ab' })).toThrow()
  })

  it('rejects label longer than 50 chars', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, label: 'a'.repeat(51) })).toThrow()
  })

  it('rejects notes longer than 300 chars', () => {
    expect(() => createAddressSchema.parse({ ...validCreate, notes: 'a'.repeat(301) })).toThrow()
  })
})

describe('updateAddressSchema', () => {
  it('accepts a single valid field', () => {
    expect(() => updateAddressSchema.parse({ street: 'Carrer Major' })).not.toThrow()
  })

  it('accepts a partial update with multiple fields', () => {
    expect(() => updateAddressSchema.parse({ street: 'Carrer Nou', number: '5' })).not.toThrow()
  })

  it('rejects an empty body (no fields)', () => {
    const result = (() => {
      try { updateAddressSchema.parse({}) }
      catch (e) { return e }
    })()
    expect(result).toBeDefined()
    expect(result.issues?.length).toBeGreaterThan(0)
  })

  it('rejects postalCode with wrong format', () => {
    expect(() => updateAddressSchema.parse({ postalCode: 'abc' })).toThrow()
  })

  it('accepts partial update of label only', () => {
    expect(() => updateAddressSchema.parse({ label: 'Trabajo' })).not.toThrow()
  })

  it('accepts partial update of city only', () => {
    // NOTE: zone validation for PATCH is done in the service, not here
    expect(() => updateAddressSchema.parse({ city: 'Mataró' })).not.toThrow()
  })

  it('accepts notes up to 300 chars', () => {
    expect(() => updateAddressSchema.parse({ notes: 'a'.repeat(300) })).not.toThrow()
  })

  it('rejects notes longer than 300 chars', () => {
    expect(() => updateAddressSchema.parse({ notes: 'a'.repeat(301) })).toThrow()
  })
})
