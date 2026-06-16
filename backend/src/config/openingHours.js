// ============================================================
// La Casa Nostra — Opening hours (authoritative source)
// Zone: Europe/Madrid (CET/CEST). All times are local.
//
// This module is the SINGLE source of truth for opening hours.
// Do NOT duplicate these ranges in validators, controllers or
// any other file. Import isWithinOpeningHours() instead.
//
// Day index follows JavaScript's Date.getDay() convention:
//   0 = Sunday, 1 = Monday, 2 = Tuesday, … 6 = Saturday
//
// Each day is an array of { open, close } ranges using "HH:MM"
// notation. Midnight end-of-day is represented as "24:00" so
// that simple string comparison works correctly within a day
// (e.g. "23:45" < "24:00"). Days without ranges ([]) are CLOSED.
//
// Current schedule (as confirmed by the business, 2026-06-16):
//   Monday    — CLOSED
//   Tuesday   — CLOSED
//   Wednesday — 18:00–23:30
//   Thursday  — 18:00–23:30
//   Friday    — 18:00–24:00 (midnight)
//   Saturday  — 11:00–16:00 and 19:00–24:00 (midnight)
//   Sunday    — 11:00–16:00 and 19:00–24:00 (midnight)
// ============================================================

/** @type {Array<Array<{open: string, close: string}>>} */
export const OPENING_HOURS = [
  // 0 — Sunday
  [
    { open: '11:00', close: '16:00' },
    { open: '19:00', close: '24:00' },
  ],
  // 1 — Monday
  [],
  // 2 — Tuesday
  [],
  // 3 — Wednesday
  [{ open: '18:00', close: '23:30' }],
  // 4 — Thursday
  [{ open: '18:00', close: '23:30' }],
  // 5 — Friday
  [{ open: '18:00', close: '24:00' }],
  // 6 — Saturday
  [
    { open: '11:00', close: '16:00' },
    { open: '19:00', close: '24:00' },
  ],
]

/**
 * Converts a "HH:MM" string to total minutes since midnight.
 * "24:00" is treated as 1440 (end of day, after "23:59").
 *
 * @param {string} hhmm
 * @returns {number}
 */
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Checks whether a given local date+time falls within the opening hours.
 *
 * A reservation time H is considered valid for a range [open, close) if:
 *   toMinutes(open) <= toMinutes(H) < toMinutes(close)
 *
 * This means a guest may start a reservation at any minute from the opening
 * time up to (but NOT including) the exact closing time.
 *
 * @param {Date} localDate
 *   A Date object whose local wall-clock time (year/month/day/hour/minute)
 *   has been set to the Europe/Madrid representation of the requested
 *   reservation date and time. The caller is responsible for parsing the
 *   incoming date+time strings in the Europe/Madrid timezone.
 * @returns {{ open: boolean, reason?: string }}
 */
export function isWithinOpeningHours(localDate) {
  const dayIndex = localDate.getDay() // 0=Sun … 6=Sat
  const ranges = OPENING_HOURS[dayIndex]

  if (!ranges || ranges.length === 0) {
    return {
      open: false,
      reason: 'El restaurante está cerrado ese día',
    }
  }

  const requestedMinutes =
    localDate.getHours() * 60 + localDate.getMinutes()

  const inAnyRange = ranges.some(
    ({ open, close }) =>
      requestedMinutes >= toMinutes(open) &&
      requestedMinutes < toMinutes(close),
  )

  if (!inAnyRange) {
    // Build a human-readable list of ranges for the error message.
    const rangeList = ranges
      .map(({ open, close }) => {
        // Normalise "24:00" back to "00:00" for the display message.
        const closeDisplay = close === '24:00' ? '00:00' : close
        return `${open}–${closeDisplay}`
      })
      .join(' i ')

    return {
      open: false,
      reason: `La franja horaria solicitada está fora de l'horari d'obertura (${rangeList})`,
    }
  }

  return { open: true }
}
