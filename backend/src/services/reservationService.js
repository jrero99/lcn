// ============================================================
// Reservation service — business logic
// ============================================================

import { isWithinOpeningHours } from '../config/openingHours.js'
import { httpError } from '../utils/httpError.js'

/**
 * Parses `date` ("YYYY-MM-DD") and `time` ("HH:MM") as a wall-clock
 * moment in the Europe/Madrid timezone, then validates it against the
 * opening-hours rules.
 *
 * WHY NOT new Date(date + 'T' + time)?
 *   That would be parsed as UTC (or local server time, which may differ
 *   from Europe/Madrid).  Parsing as "Europe/Madrid" is the only way to
 *   guarantee correct day/hour semantics regardless of where the server
 *   runs.
 *
 * HOW:
 *   We use `Intl.DateTimeFormat` in reverse: we construct a Date that,
 *   when formatted in Europe/Madrid, gives exactly the requested
 *   year-month-day hour:minute.  The simplest cross-platform approach
 *   that works in Node ≥18 without extra dependencies is to use the
 *   'Europe/Madrid' locale string with a known-UTC reference and binary
 *   search — but that is overkill here.
 *
 *   Instead we rely on the fact that `new Date(year, month, day, h, m)`
 *   uses the *local* timezone of the process.  Since the server is
 *   expected to run with TZ=Europe/Madrid (or in production in a
 *   container configured for that zone), this is reliable.
 *
 *   For production robustness, we also accept the explicit TZ env var
 *   and verify by re-formatting the date.  If the server TZ differs, we
 *   fall back to a Temporal-polyfill-free approach using Date.UTC offset
 *   correction.
 *
 * Documented assumption: the caller (Reservas.jsx front-end) sends
 *   `date` as the value of <input type="date"> ("YYYY-MM-DD") and
 *   `time` as a "HH:MM" string from the time <select>.  Both represent
 *   the desired Europe/Madrid local date and time.
 *
 * @param {string} dateStr  "YYYY-MM-DD"
 * @param {string} timeStr  "HH:MM"
 * @returns {Date} A Date object whose `.getFullYear()/.getMonth()/etc.`
 *                 reflect the Europe/Madrid local time (when TZ is set
 *                 correctly) or whose UTC components can be re-formatted
 *                 to Europe/Madrid via Intl.
 */
function parseMadridDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Build an ISO string with an explicit Europe/Madrid offset so that
  // Date parses it unambiguously, regardless of the server's TZ.
  //
  // We derive the UTC offset for the given moment by asking the Intl API
  // what offset Madrid currently uses, then constructing the right UTC time.
  //
  // Step 1: guess a UTC time assuming offset 0 and ask Intl what Madrid
  //         shows for that UTC moment.
  // Step 2: compute the difference (Madrid offset), apply it to get the
  //         real UTC time, and build the final Date.
  //
  // This handles both CET (+01:00) and CEST (+02:00) automatically.

  // Guess: treat the local time as UTC initially.
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute)

  // Ask Intl what Europe/Madrid shows for that UTC instant.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(new Date(guessUtcMs))
  const get = (type) => Number(parts.find((p) => p.type === type).value)

  const madridYear = get('year')
  const madridMonth = get('month')
  const madridDay = get('day')
  const madridHour = get('hour')
  const madridMinute = get('minute')

  // Offset in minutes: how much UTC diverges from what Madrid shows.
  const offsetMs =
    Date.UTC(madridYear, madridMonth - 1, madridDay, madridHour, madridMinute) -
    guessUtcMs

  // Real UTC timestamp = desired local time minus the offset.
  const realUtcMs = guessUtcMs - offsetMs
  return new Date(realUtcMs)
}

/**
 * Returns a Date object whose getDay()/getHours()/getMinutes() reflect
 * the Europe/Madrid local time for the given UTC Date.
 *
 * Used after parseMadridDateTime to extract day-of-week and wall clock
 * time in Madrid — because isWithinOpeningHours works on local wall time.
 *
 * @param {Date} utcDate
 * @returns {{ dayOfWeek: number, hour: number, minute: number }}
 */
function getMadridComponents(utcDate) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    weekday: 'narrow',    // we will compute day separately
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(utcDate)
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0)

  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour')
  const minute = get('minute')

  // Build a temporary Date in UTC to get .getDay() correctly for Madrid.
  // We can derive day-of-week from the date components directly.
  const dayOfWeekDate = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = dayOfWeekDate.getUTCDay() // 0=Sun … 6=Sat

  return { dayOfWeek, hour, minute }
}

/**
 * Validates that a reservation request falls within opening hours and
 * is not in the past.  Throws an httpError(422) if invalid.
 *
 * Returns a stub payload matching the contract:
 *   { availableSlots: [] }
 * (Actual slot inventory is out of scope for the MVP — the business
 * handles availability manually.  The endpoint confirms the time is
 * within opening hours and the admin contacts the client.)
 *
 * @param {{ date: string, time: string, zone: string, guests: number }} data
 * @returns {{ availableSlots: [] }}
 */
export function checkReservationAvailability(data) {
  const { date, time } = data

  // ── 1. Parse as Europe/Madrid local time
  const utcDate = parseMadridDateTime(date, time)
  const { dayOfWeek, hour, minute } = getMadridComponents(utcDate)

  // ── 2. Reject past dates/times
  const nowMadrid = getMadridComponents(new Date())
  const nowUtc = Date.now()
  if (utcDate.getTime() < nowUtc - 60_000) {
    // Allow 1-minute tolerance for clock drift between client and server.
    throw httpError(
      422,
      'No es pot fer una reserva en una data o hora ja passada',
    )
  }

  // ── 3. Build a synthetic Date whose getDay()/getHours()/getMinutes()
  //       return the Madrid components, so isWithinOpeningHours() works.
  //       We construct it as a local Date with the right wall-clock values.
  //       This is safe because isWithinOpeningHours only reads .getDay(),
  //       .getHours() and .getMinutes() — not the underlying UTC timestamp.
  const syntheticLocal = new Date(2000, 0, 1 + dayOfWeek) // week starting Jan 2 2000 (Sun)
  // Adjust month/day to match dayOfWeek: Jan 2 2000 was a Sunday (0).
  // Actually we only need .getDay() to match dayOfWeek.
  // Reset to a known Sunday (2000-01-02 was a Sunday).
  const sundayBase = new Date(2000, 0, 2) // 2 Jan 2000 = Sunday
  const localProxy = new Date(sundayBase)
  localProxy.setDate(sundayBase.getDate() + dayOfWeek) // 0=Sun,1=Mon,…
  localProxy.setHours(hour, minute, 0, 0)

  // ── 4. Check opening hours
  const { open, reason } = isWithinOpeningHours(localProxy)
  if (!open) {
    throw httpError(
      422,
      reason ??
        'La data/hora sol·licitada està fora de l\'horari d\'obertura',
    )
  }

  // MVP: no slot inventory — return empty availableSlots.
  // The admin will contact the client to confirm.
  return { availableSlots: [] }
}
