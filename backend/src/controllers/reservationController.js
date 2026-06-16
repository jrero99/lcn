import { createReservationSchema } from '../validators/reservations.js'
import { checkReservationAvailability } from '../services/reservationService.js'

/**
 * POST /api/reservations
 *
 * Validates the request body and checks whether the requested date/time
 * falls within the opening hours of La Casa Nostra.
 *
 * Contract:
 *   Request body: { date: "YYYY-MM-DD", time: "HH:MM", zone: string, guests: number }
 *   Success (200): { availableSlots: [] }
 *   Error (422):   { error: string } or Zod validation shape
 */
export async function createReservation(req, res, next) {
  try {
    const data = createReservationSchema.parse(req.body)
    const result = checkReservationAvailability(data)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}
