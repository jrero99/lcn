import { useState } from 'react'

// Mock time slots: lunch (13:00–16:30) and dinner (19:30–22:30), every 30 min.
const TIME_SLOTS = [
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30',
]

// Mock zones for the restaurant.
const ZONES = [
  { value: 'interior', label: 'Interior' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'barra', label: 'Barra' },
]

// Mock guest counts: 1–6. Groups ≥7 go via WhatsApp (shown in footer text).
const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6]

// Default date: 18/07/2026 formatted as YYYY-MM-DD for the date input.
const DEFAULT_DATE = '2026-07-18'

// WhatsApp link — TODO: replace with real phone number once provided by the business.
// Format: https://wa.me/<country-code><number> (no spaces, no +)
const WHATSAPP_HREF = 'https://wa.me/34XXXXXXXXX' // TODO: add real number

export default function Reservas() {
  const [date, setDate] = useState(DEFAULT_DATE)
  const [time, setTime] = useState('')
  const [zone, setZone] = useState('')
  const [guests, setGuests] = useState('')
  const [errors, setErrors] = useState({})
  // 'idle' | 'searching' — placeholder state for the future modal.
  const [searchState, setSearchState] = useState('idle')

  function validate() {
    const next = {}
    if (!date) next.date = 'Elige una fecha'
    if (!time) next.time = 'Elige una hora'
    if (!zone) next.zone = 'Elige la zona'
    if (!guests) next.guests = 'Indica el número de personas'
    return next
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // All fields are filled — show searching placeholder state.
    setSearchState('searching')

    // TODO: abrir modal HORAS DISPONIBLES (iteración futura)
    // When the modal is built, this is where we would call:
    //   openAvailabilityModal({ date, time, zone, guests })
    // and the modal would show the available slots for the selected criteria.
  }

  function handleFieldChange(setter, field) {
    return (e) => {
      setter(e.target.value)
      // Clear the error for this field as soon as the user makes a choice.
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
      // If we were in "searching" state and the user changes something, reset.
      setSearchState('idle')
    }
  }

  return (
    <section className="reservas">
      <div className="reservas-inner">
        <h1 className="reservas-title">Haz tu reserva</h1>
        <p className="reservas-sub">
          Te ayudamos a encontrar el bocadillo ideal para ti.<br />
          Tú tan solo preocúpate de disfrutar
        </p>

        <form
          className="reservas-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Formulario de reserva"
        >
          <div className="reservas-grid">
            {/* ── Field 1: Date ── */}
            <div className="reservas-field-wrap">
              <label className="reservas-field" htmlFor="res-date">
                <CalendarIcon />
                <input
                  id="res-date"
                  type="date"
                  value={date}
                  onChange={handleFieldChange(setDate, 'date')}
                  aria-describedby={errors.date ? 'res-date-error' : undefined}
                />
              </label>
              {errors.date && (
                <p id="res-date-error" className="field-error">
                  {errors.date}
                </p>
              )}
            </div>

            {/* ── Field 2: Time ── */}
            <div className="reservas-field-wrap">
              <label className="reservas-field" htmlFor="res-time">
                <ClockIcon />
                <select
                  id="res-time"
                  value={time}
                  onChange={handleFieldChange(setTime, 'time')}
                  aria-describedby={errors.time ? 'res-time-error' : undefined}
                >
                  <option value="" disabled>Hora</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </label>
              {errors.time && (
                <p id="res-time-error" className="field-error">
                  {errors.time}
                </p>
              )}
            </div>

            {/* ── Field 3: Zone ── */}
            <div className="reservas-field-wrap">
              <label className="reservas-field" htmlFor="res-zone">
                <PinIcon />
                <select
                  id="res-zone"
                  value={zone}
                  onChange={handleFieldChange(setZone, 'zone')}
                  aria-describedby={errors.zone ? 'res-zone-error' : undefined}
                >
                  <option value="" disabled>Elige la zona</option>
                  {ZONES.map((z) => (
                    <option key={z.value} value={z.value}>{z.label}</option>
                  ))}
                </select>
              </label>
              {errors.zone && (
                <p id="res-zone-error" className="field-error">
                  {errors.zone}
                </p>
              )}
            </div>

            {/* ── Field 4: Guests ── */}
            <div className="reservas-field-wrap">
              <label className="reservas-field" htmlFor="res-guests">
                <PersonIcon />
                <select
                  id="res-guests"
                  value={guests}
                  onChange={handleFieldChange(setGuests, 'guests')}
                  aria-describedby={errors.guests ? 'res-guests-error' : undefined}
                >
                  <option value="" disabled>Personas</option>
                  {GUEST_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'persona' : 'personas'}
                    </option>
                  ))}
                </select>
              </label>
              {errors.guests && (
                <p id="res-guests-error" className="field-error">
                  {errors.guests}
                </p>
              )}
            </div>
          </div>

          {/* Search button */}
          <button type="submit" className="reservas-search-btn">
            {searchState === 'searching' ? 'Buscando mesas disponibles…' : 'Buscar mesa'}
          </button>

          {/* Searching placeholder result — shown while waiting for the modal */}
          {searchState === 'searching' && (
            <p className="reservas-searching-hint" role="status" aria-live="polite">
              Buscando mesas disponibles para el {formatDate(date)} a las {time}…
            </p>
          )}
        </form>

        {/* Divider + WhatsApp CTA */}
        <div className="reservas-divider" role="separator" />
        <p className="reservas-group-text">
          Si quieres reservar para grupos (a partir de 7 personas) o tienes cualquier duda:
        </p>
        <a
          className="reservas-whatsapp-btn"
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
        >
          <WhatsAppIcon />
          WhatsApp
        </a>
      </div>
    </section>
  )
}

// Formats YYYY-MM-DD → DD/MM/YYYY for display in the searching hint.
function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
// All icons use aria-hidden so screen readers skip them (labels carry the name).

function CalendarIcon() {
  return (
    <svg
      className="reservas-field-icon"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      className="reservas-field-icon"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 15.5" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg
      className="reservas-field-icon"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg
      className="reservas-field-icon"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  )
}

function WhatsAppIcon() {
  // Simplified WhatsApp-style speech bubble icon (no external dependency).
  return (
    <svg
      className="reservas-whatsapp-icon"
      width="22" height="22" viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.418A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Zm4.85 13.535c-.204.575-1.2 1.098-1.648 1.137-.43.037-.834.197-2.804-.584-2.367-.948-3.88-3.37-3.997-3.526-.117-.157-.95-1.264-.95-2.412 0-1.148.6-1.712.815-1.945.216-.233.47-.29.627-.29l.45.008c.145.006.337-.055.527.402.196.468.666 1.616.725 1.732.058.116.097.252.019.406-.078.155-.117.252-.234.387-.116.136-.244.304-.349.408-.117.117-.238.243-.103.476.136.233.602.993 1.293 1.608.889.791 1.638 1.035 1.871 1.151.233.117.369.097.506-.058.136-.156.583-.682.739-.916.155-.234.31-.194.523-.117.214.078 1.36.642 1.594.759.234.117.39.175.448.272.058.097.058.563-.146 1.1Z" />
    </svg>
  )
}
