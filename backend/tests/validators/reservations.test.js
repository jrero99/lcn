import { describe, it, expect } from '@jest/globals'
import { createReservationSchema } from '../../src/validators/reservations.js'

const valid = {
  date: '2026-08-15',
  time: '19:30',
  zone: 'interior',
  guests: 4,
}

describe('createReservationSchema', () => {
  it('accepts a valid payload', () => {
    expect(() => createReservationSchema.parse(valid)).not.toThrow()
  })

  it('rejects an invalid date format (not YYYY-MM-DD)', () => {
    expect(() => createReservationSchema.parse({ ...valid, date: '15/08/2026' })).toThrow()
  })

  it('rejects an invalid time format', () => {
    expect(() => createReservationSchema.parse({ ...valid, time: '25:00' })).toThrow()
  })

  it('rejects time with seconds', () => {
    expect(() => createReservationSchema.parse({ ...valid, time: '19:30:00' })).toThrow()
  })

  it('accepts time 00:00', () => {
    expect(() => createReservationSchema.parse({ ...valid, time: '00:00' })).not.toThrow()
  })

  it('accepts time 23:59', () => {
    expect(() => createReservationSchema.parse({ ...valid, time: '23:59' })).not.toThrow()
  })

  it('rejects an invalid zone', () => {
    expect(() => createReservationSchema.parse({ ...valid, zone: 'rooftop' })).toThrow()
  })

  it('accepts all valid zones', () => {
    for (const zone of ['interior', 'terrassa', 'barra']) {
      expect(() => createReservationSchema.parse({ ...valid, zone })).not.toThrow()
    }
  })

  it('rejects guests = 0', () => {
    expect(() => createReservationSchema.parse({ ...valid, guests: 0 })).toThrow()
  })

  it('rejects guests = 21 (over max)', () => {
    expect(() => createReservationSchema.parse({ ...valid, guests: 21 })).toThrow()
  })

  it('accepts guests = 20 (max)', () => {
    expect(() => createReservationSchema.parse({ ...valid, guests: 20 })).not.toThrow()
  })

  it('accepts guests = 1 (min)', () => {
    expect(() => createReservationSchema.parse({ ...valid, guests: 1 })).not.toThrow()
  })

  it('blocks honeypot when filled', () => {
    expect(() => createReservationSchema.parse({ ...valid, _honey: 'x' })).toThrow()
  })

  it('accepts honeypot as empty string', () => {
    expect(() => createReservationSchema.parse({ ...valid, _honey: '' })).not.toThrow()
  })
})
