// ============================================================
// Validator — POST /api/reservations
//
// Date/time format contract (server assumption):
//   • `date` — "YYYY-MM-DD" (ISO date, Europe/Madrid local date)
//   • `time` — "HH:MM"     (24-hour local clock, Europe/Madrid)
//
// The frontend sends these two separate fields (matching the
// <input type="date"> and <select> in Reservas.jsx).  The
// server interprets them as Europe/Madrid local time — never
// as UTC — to avoid day/hour displacement.
// ============================================================

import { z } from 'zod'

// Allowed zones (must match the options in Reservas.jsx)
const VALID_ZONES = ['interior', 'terrassa', 'barra']

// Maximum guests per online reservation
const MAX_GUESTS = 20

export const createReservationSchema = z
  .object({
    // "YYYY-MM-DD"
    date: z
      .string()
      .trim()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'date must be in YYYY-MM-DD format',
      ),
    // "HH:MM" (24-hour)
    time: z
      .string()
      .trim()
      .regex(
        /^(?:[01]\d|2[0-3]):[0-5]\d$/,
        'time must be in HH:MM format (24-hour, 00:00–23:59)',
      ),
    zone: z.enum(VALID_ZONES, {
      errorMap: () => ({
        message: `zone must be one of: ${VALID_ZONES.join(', ')}`,
      }),
    }),
    guests: z
      .number()
      .int('guests must be an integer')
      .min(1, 'guests must be at least 1')
      .max(MAX_GUESTS, `Maximum ${MAX_GUESTS} guests per reservation`),
    // Honeypot — must be absent or empty string
    _honey: z.string().max(0).optional(),
  })
