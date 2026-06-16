// hours.test.js — unit tests for opening hours utilities.
import {
  isOpenDay,
  closedDayMessage,
  timeToMinutes,
  minutesToTime,
  getSlotsForDay,
  OPENING_HOURS,
} from '../../data/hours.js'

describe('isOpenDay', () => {
  test('returns false for Monday (1) — closed', () => {
    expect(isOpenDay(1)).toBe(false)
  })

  test('returns false for Tuesday (2) — closed', () => {
    expect(isOpenDay(2)).toBe(false)
  })

  test('returns true for Wednesday (3) — open', () => {
    expect(isOpenDay(3)).toBe(true)
  })

  test('returns true for Thursday (4) — open', () => {
    expect(isOpenDay(4)).toBe(true)
  })

  test('returns true for Friday (5) — open', () => {
    expect(isOpenDay(5)).toBe(true)
  })

  test('returns true for Saturday (6) — open', () => {
    expect(isOpenDay(6)).toBe(true)
  })

  test('returns true for Sunday (0) — open', () => {
    expect(isOpenDay(0)).toBe(true)
  })
})

describe('closedDayMessage', () => {
  test('returns human-readable message for Monday', () => {
    expect(closedDayMessage(1)).toBe('Cerramos los lunes, elige otro día.')
  })

  test('returns human-readable message for Tuesday', () => {
    expect(closedDayMessage(2)).toBe('Cerramos los martes, elige otro día.')
  })

  test('works for all days', () => {
    for (let i = 0; i <= 6; i++) {
      expect(closedDayMessage(i)).toMatch(/Cerramos los .+, elige otro día\./)
    }
  })
})

describe('timeToMinutes', () => {
  test('converts "18:00" to 1080', () => {
    expect(timeToMinutes('18:00')).toBe(1080)
  })

  test('converts "24:00" to 1440 (midnight)', () => {
    expect(timeToMinutes('24:00')).toBe(1440)
  })

  test('converts "00:00" to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0)
  })

  test('converts "23:30" to 1410', () => {
    expect(timeToMinutes('23:30')).toBe(1410)
  })
})

describe('minutesToTime', () => {
  test('converts 1080 to "18:00"', () => {
    expect(minutesToTime(1080)).toBe('18:00')
  })

  test('converts 0 to "00:00"', () => {
    expect(minutesToTime(0)).toBe('00:00')
  })

  test('converts 1440 to "24:00"', () => {
    expect(minutesToTime(1440)).toBe('24:00')
  })

  test('converts 90 to "01:30"', () => {
    expect(minutesToTime(90)).toBe('01:30')
  })
})

describe('getSlotsForDay', () => {
  test('returns empty array for Monday (closed)', () => {
    expect(getSlotsForDay(1)).toEqual([])
  })

  test('returns correct slots for Wednesday (18:00-23:30)', () => {
    const slots = getSlotsForDay(3)
    expect(slots[0]).toBe('18:00')
    expect(slots[slots.length - 1]).toBe('23:00')
    // 18:00 to 23:00 in 30-min steps = 11 slots
    expect(slots.length).toBe(11)
  })

  test('returns correct slots for Friday (18:00-24:00)', () => {
    const slots = getSlotsForDay(5)
    expect(slots[0]).toBe('18:00')
    expect(slots[slots.length - 1]).toBe('23:30')
    // 18:00 to 23:30 = 12 slots
    expect(slots.length).toBe(12)
  })

  test('returns correct slots for Sunday (split schedule)', () => {
    const slots = getSlotsForDay(0)
    // Morning: 11:00 to 15:30 = 10 slots; Evening: 19:00 to 23:30 = 10 slots; total = 20
    expect(slots[0]).toBe('11:00')
    expect(slots).toContain('15:30')
    expect(slots).toContain('19:00')
    expect(slots[slots.length - 1]).toBe('23:30')
    expect(slots.length).toBe(20)
  })

  test('last slot is 30 minutes before close', () => {
    // Wednesday closes at 23:30, so last slot = 23:00
    const slots = getSlotsForDay(3)
    expect(slots[slots.length - 1]).toBe('23:00')
  })
})
