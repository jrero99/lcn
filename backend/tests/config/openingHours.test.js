import { describe, it, expect } from '@jest/globals'
import { isWithinOpeningHours, OPENING_HOURS } from '../../src/config/openingHours.js'

// Helper to build a Date with a specific dayOfWeek and hour:minute
// dayOfWeek: 0=Sun, 1=Mon, ... 6=Sat
// We use a fixed week: Jan 2, 2000 = Sunday (day 0)
function makeLocalDate(dayOfWeek, hour, minute) {
  const sundayBase = new Date(2000, 0, 2) // 2 Jan 2000 = Sunday
  const d = new Date(sundayBase)
  d.setDate(sundayBase.getDate() + dayOfWeek)
  d.setHours(hour, minute, 0, 0)
  return d
}

describe('OPENING_HOURS data', () => {
  it('has 7 entries (one per day of week)', () => {
    expect(OPENING_HOURS).toHaveLength(7)
  })

  it('Monday (1) and Tuesday (2) are closed (empty arrays)', () => {
    expect(OPENING_HOURS[1]).toEqual([])
    expect(OPENING_HOURS[2]).toEqual([])
  })

  it('Wednesday, Thursday have one range each', () => {
    expect(OPENING_HOURS[3]).toHaveLength(1)
    expect(OPENING_HOURS[4]).toHaveLength(1)
  })

  it('Friday has one range', () => {
    expect(OPENING_HOURS[5]).toHaveLength(1)
  })

  it('Saturday and Sunday have two ranges', () => {
    expect(OPENING_HOURS[6]).toHaveLength(2)
    expect(OPENING_HOURS[0]).toHaveLength(2)
  })
})

describe('isWithinOpeningHours', () => {
  // Monday — CLOSED
  it('Monday at any hour returns open=false', () => {
    const result = isWithinOpeningHours(makeLocalDate(1, 12, 0))
    expect(result.open).toBe(false)
    expect(result.reason).toBeDefined()
  })

  // Tuesday — CLOSED
  it('Tuesday returns open=false', () => {
    expect(isWithinOpeningHours(makeLocalDate(2, 20, 0)).open).toBe(false)
  })

  // Wednesday — 18:00–23:30
  it('Wednesday at 18:00 returns open=true', () => {
    expect(isWithinOpeningHours(makeLocalDate(3, 18, 0)).open).toBe(true)
  })

  it('Wednesday at 23:29 returns open=true', () => {
    expect(isWithinOpeningHours(makeLocalDate(3, 23, 29)).open).toBe(true)
  })

  it('Wednesday at 23:30 returns open=false (closing time is exclusive)', () => {
    expect(isWithinOpeningHours(makeLocalDate(3, 23, 30)).open).toBe(false)
  })

  it('Wednesday at 17:59 returns open=false (before opening)', () => {
    expect(isWithinOpeningHours(makeLocalDate(3, 17, 59)).open).toBe(false)
  })

  it('Wednesday closed returns a reason string', () => {
    const result = isWithinOpeningHours(makeLocalDate(3, 10, 0))
    expect(typeof result.reason).toBe('string')
    expect(result.reason.length).toBeGreaterThan(0)
  })

  // Thursday — 18:00–23:30
  it('Thursday at 20:00 returns open=true', () => {
    expect(isWithinOpeningHours(makeLocalDate(4, 20, 0)).open).toBe(true)
  })

  // Friday — 18:00–24:00
  it('Friday at 23:59 returns open=true (midnight is exclusive close)', () => {
    expect(isWithinOpeningHours(makeLocalDate(5, 23, 59)).open).toBe(true)
  })

  it('Friday at 17:00 returns open=false', () => {
    expect(isWithinOpeningHours(makeLocalDate(5, 17, 0)).open).toBe(false)
  })

  // Saturday — 11:00–16:00 and 19:00–24:00
  it('Saturday at 11:00 returns open=true (first range)', () => {
    expect(isWithinOpeningHours(makeLocalDate(6, 11, 0)).open).toBe(true)
  })

  it('Saturday at 15:59 returns open=true', () => {
    expect(isWithinOpeningHours(makeLocalDate(6, 15, 59)).open).toBe(true)
  })

  it('Saturday at 16:00 returns open=false (gap between ranges)', () => {
    expect(isWithinOpeningHours(makeLocalDate(6, 16, 0)).open).toBe(false)
  })

  it('Saturday at 17:00 returns open=false (between ranges)', () => {
    expect(isWithinOpeningHours(makeLocalDate(6, 17, 0)).open).toBe(false)
  })

  it('Saturday at 19:00 returns open=true (second range)', () => {
    expect(isWithinOpeningHours(makeLocalDate(6, 19, 0)).open).toBe(true)
  })

  it('Saturday at 23:59 returns open=true', () => {
    expect(isWithinOpeningHours(makeLocalDate(6, 23, 59)).open).toBe(true)
  })

  // Sunday — 11:00–16:00 and 19:00–24:00
  it('Sunday at 12:00 returns open=true', () => {
    expect(isWithinOpeningHours(makeLocalDate(0, 12, 0)).open).toBe(true)
  })

  it('Sunday at 16:00 returns open=false', () => {
    expect(isWithinOpeningHours(makeLocalDate(0, 16, 0)).open).toBe(false)
  })

  it('Sunday at 21:00 returns open=true', () => {
    expect(isWithinOpeningHours(makeLocalDate(0, 21, 0)).open).toBe(true)
  })

  it('closed days have reason "cerrado ese día"', () => {
    const result = isWithinOpeningHours(makeLocalDate(1, 14, 0))
    expect(result.reason).toMatch(/cerrado/i)
  })
})
