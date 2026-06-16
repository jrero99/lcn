/**
 * SINGLE SOURCE OF TRUTH for La Casa Nostra opening hours.
 *
 * OPENING_HOURS: indexed by JS day-of-week (Date.getDay()).
 *   0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 *   4 = Thursday, 5 = Friday, 6 = Saturday.
 *
 * Each entry is an array of { open: 'HH:MM', close: 'HH:MM' } ranges.
 * Use '24:00' to represent midnight (end-of-day).
 * Empty array = closed that day.
 *
 * Consumers:
 *   - Footer.jsx   → uses FOOTER_HOURS for the display table
 *   - Reservas.jsx → uses OPENING_HOURS to compute valid time slots
 *
 * NOTE: when real backend integration lands, POST /api/reservations will
 * also validate against the business schedule server-side. Client-side
 * validation here is UX only.
 */
export const OPENING_HOURS = {
  0: [{ open: '11:00', close: '16:00' }, { open: '19:00', close: '24:00' }], // Sunday
  1: [],                                                  // Monday  — closed
  2: [],                                                  // Tuesday — closed
  3: [{ open: '18:00', close: '23:30' }],               // Wednesday
  4: [{ open: '18:00', close: '23:30' }],               // Thursday
  5: [{ open: '18:00', close: '24:00' }],               // Friday
  6: [{ open: '11:00', close: '16:00' }, { open: '19:00', close: '24:00' }], // Saturday
}

/**
 * Returns true if the restaurant is open on the given JS day index (0–6).
 */
export function isOpenDay(dayIndex) {
  return OPENING_HOURS[dayIndex]?.length > 0
}

/**
 * Returns a human-readable closed-day message for use in form validation.
 * "Cerramos los lunes y martes, elige otro día."
 */
export function closedDayMessage(dayIndex) {
  const names = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
  return `Cerramos los ${names[dayIndex]}, elige otro día.`
}

/**
 * Converts 'HH:MM' (including '24:00') to total minutes since midnight.
 */
export function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Converts total minutes to 'HH:MM' string.
 * Handles values ≥ 1440 (i.e. 24:00 = 1440 min → stays as '24:00').
 */
export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Given a JS day index (0–6), returns an array of 'HH:MM' strings
 * representing every valid booking slot (every 30 minutes within each
 * open range, last slot = close − 30 min).
 *
 * Examples:
 *   Wednesday (3) → ['18:00', '18:30', ..., '23:00']
 *   Friday    (5) → ['18:00', '18:30', ..., '23:30']
 *   Saturday  (6) → ['11:00', ..., '15:30', '19:00', ..., '23:30']
 *   Sunday    (0) → ['11:00', ..., '15:30', '19:00', ..., '23:30']
 *   Monday    (1) → []
 */
export function getSlotsForDay(dayIndex) {
  const ranges = OPENING_HOURS[dayIndex] ?? []
  const slots = []
  for (const { open, close } of ranges) {
    const openMin  = timeToMinutes(open)
    const closeMin = timeToMinutes(close)   // 24:00 → 1440
    // Last bookable slot: close − 30 min
    for (let t = openMin; t <= closeMin - 30; t += 30) {
      slots.push(minutesToTime(t))
    }
  }
  return slots
}

// ---------------------------------------------------------------------------
// Footer display data
// ---------------------------------------------------------------------------

/**
 * FOOTER_HOURS: the rows displayed in the footer schedule table.
 * Derived from OPENING_HOURS so they can never diverge.
 *
 * Each entry: { day: string, time: string }
 * This matches the existing Footer markup exactly.
 */
export const FOOTER_HOURS = [
  { day: 'Miércoles a jueves', time: '18:00 – 23:30' },
  { day: 'Viernes',            time: '18:00 – 00:00' },
  { day: 'Sábado y domingo',   time: '11:00 – 16:00 / 19:00 – 00:00' },
]
