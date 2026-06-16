import { describe, it, expect } from '@jest/globals'
import { checkReservationAvailability } from '../../src/services/reservationService.js'

// Helper: date string far in the future (to avoid "past date" rejection)
function futureDate(dayOfWeekTarget, timeStr) {
  // Find next occurrence of the target day-of-week in the future
  const now = new Date()
  const current = now.getDay()
  let daysAhead = (dayOfWeekTarget - current + 7) % 7
  if (daysAhead === 0) daysAhead = 7 // always at least 1 week ahead
  const target = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  const yyyy = target.getFullYear()
  const mm = String(target.getMonth() + 1).padStart(2, '0')
  const dd = String(target.getDate()).padStart(2, '0')
  return { date: `${yyyy}-${mm}-${dd}`, time: timeStr }
}

describe('checkReservationAvailability', () => {
  const zone = 'interior'
  const guests = 2

  // ── Past dates ────────────────────────────────────────────────
  it('throws 422 for a date/time in the past', () => {
    expect(() =>
      checkReservationAvailability({ date: '2020-01-01', time: '12:00', zone, guests })
    ).toThrow(expect.objectContaining({ status: 422 }))
  })

  // ── Closed days ───────────────────────────────────────────────
  it('throws 422 for Monday (closed)', () => {
    const { date, time } = futureDate(1, '14:00') // Monday
    expect(() =>
      checkReservationAvailability({ date, time, zone, guests })
    ).toThrow(expect.objectContaining({ status: 422 }))
  })

  it('throws 422 for Tuesday (closed)', () => {
    const { date, time } = futureDate(2, '20:00') // Tuesday
    expect(() =>
      checkReservationAvailability({ date, time, zone, guests })
    ).toThrow(expect.objectContaining({ status: 422 }))
  })

  // ── Wednesday: 18:00–23:30 ────────────────────────────────────
  it('accepts Wednesday at 18:00', () => {
    const { date } = futureDate(3, '18:00')
    const result = checkReservationAvailability({ date, time: '18:00', zone, guests })
    expect(result).toEqual({ availableSlots: [] })
  })

  it('accepts Wednesday at 22:00', () => {
    const { date } = futureDate(3, '22:00')
    const result = checkReservationAvailability({ date, time: '22:00', zone, guests })
    expect(result).toEqual({ availableSlots: [] })
  })

  it('rejects Wednesday at 23:30 (closing time)', () => {
    const { date } = futureDate(3, '23:30')
    expect(() =>
      checkReservationAvailability({ date, time: '23:30', zone, guests })
    ).toThrow(expect.objectContaining({ status: 422 }))
  })

  it('rejects Wednesday at 17:00 (before opening)', () => {
    const { date } = futureDate(3, '17:00')
    expect(() =>
      checkReservationAvailability({ date, time: '17:00', zone, guests })
    ).toThrow(expect.objectContaining({ status: 422 }))
  })

  // ── Friday: 18:00–24:00 ───────────────────────────────────────
  it('accepts Friday at 23:59', () => {
    const { date } = futureDate(5, '23:59')
    const result = checkReservationAvailability({ date, time: '23:59', zone, guests })
    expect(result).toEqual({ availableSlots: [] })
  })

  it('rejects Friday at 16:00 (before opening)', () => {
    const { date } = futureDate(5, '16:00')
    expect(() =>
      checkReservationAvailability({ date, time: '16:00', zone, guests })
    ).toThrow(expect.objectContaining({ status: 422 }))
  })

  // ── Saturday: 11:00–16:00 and 19:00–24:00 ────────────────────
  it('accepts Saturday at 12:00 (first range)', () => {
    const { date } = futureDate(6, '12:00')
    const result = checkReservationAvailability({ date, time: '12:00', zone, guests })
    expect(result).toEqual({ availableSlots: [] })
  })

  it('rejects Saturday at 16:30 (gap between ranges)', () => {
    const { date } = futureDate(6, '16:30')
    expect(() =>
      checkReservationAvailability({ date, time: '16:30', zone, guests })
    ).toThrow(expect.objectContaining({ status: 422 }))
  })

  it('accepts Saturday at 20:00 (second range)', () => {
    const { date } = futureDate(6, '20:00')
    const result = checkReservationAvailability({ date, time: '20:00', zone, guests })
    expect(result).toEqual({ availableSlots: [] })
  })

  // ── Sunday: 11:00–16:00 and 19:00–24:00 ─────────────────────
  it('accepts Sunday at 13:00', () => {
    const { date } = futureDate(0, '13:00')
    const result = checkReservationAvailability({ date, time: '13:00', zone, guests })
    expect(result).toEqual({ availableSlots: [] })
  })

  it('rejects Sunday at 17:00 (gap)', () => {
    const { date } = futureDate(0, '17:00')
    expect(() =>
      checkReservationAvailability({ date, time: '17:00', zone, guests })
    ).toThrow(expect.objectContaining({ status: 422 }))
  })

  // ── Return shape ──────────────────────────────────────────────
  it('returns { availableSlots: [] } (MVP stub)', () => {
    const { date } = futureDate(4, '19:00') // Thursday
    const result = checkReservationAvailability({ date, time: '19:00', zone, guests })
    expect(result).toStrictEqual({ availableSlots: [] })
  })
})
