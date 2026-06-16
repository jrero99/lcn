// Reservas.test.jsx — tests for the reservations page.
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Reservas from '../../pages/Reservas.jsx'

// A future open date (Wednesday = day 3, which is open).
// Use a fixed date far in the future so the test doesn't expire.
const FUTURE_OPEN_DATE = '2030-06-05' // A Wednesday

// A future closed date (Monday = day 1, which is closed).
const FUTURE_CLOSED_DATE = '2030-06-03' // A Monday

function renderReservas() {
  return render(
    <MemoryRouter>
      <Reservas />
    </MemoryRouter>
  )
}

describe('Reservas page', () => {
  test('renders the form heading', () => {
    renderReservas()
    expect(screen.getByText('Haz tu reserva')).toBeInTheDocument()
  })

  test('shows validation errors on empty submit', async () => {
    renderReservas()
    const form = document.querySelector('form[aria-label="Formulario de reserva"]')
    fireEvent.submit(form)
    // Errors appear in role="alert" elements
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.some((el) => el.textContent.includes('Elige una fecha'))).toBe(true)
      expect(alerts.some((el) => el.textContent.includes('Elige la zona'))).toBe(true)
      expect(alerts.some((el) => el.textContent.includes('Indica el número de personas'))).toBe(true)
    })
  })

  test('time selector is disabled until a valid date is chosen', () => {
    renderReservas()
    // The time select is disabled when no date is chosen
    // The label says "Primero elige un día abierto" when disabled
    expect(screen.getByText('Primero elige un día abierto')).toBeInTheDocument()
  })

  test('selecting an open date enables the time selector', async () => {
    renderReservas()
    const dateInput = document.getElementById('res-date')
    fireEvent.change(dateInput, { target: { value: FUTURE_OPEN_DATE } })
    const timeSel = document.getElementById('res-time')
    await waitFor(() => expect(timeSel).not.toBeDisabled())
  })

  test('selecting a closed day shows a closed message', async () => {
    renderReservas()
    const dateInput = document.getElementById('res-date')
    fireEvent.change(dateInput, { target: { value: FUTURE_CLOSED_DATE } })
    await waitFor(() => expect(screen.getByText(/Cerramos los lunes/)).toBeInTheDocument())
  })

  test('time slots appear for open days', async () => {
    renderReservas()
    const dateInput = document.getElementById('res-date')
    fireEvent.change(dateInput, { target: { value: FUTURE_OPEN_DATE } }) // Wednesday
    const timeSel = document.getElementById('res-time')
    await waitFor(() => expect(timeSel).not.toBeDisabled())
    // Wednesday opens at 18:00
    expect(screen.getByText('18:00')).toBeInTheDocument()
  })

  test('submitting a valid form shows searching state', async () => {
    renderReservas()

    // Fill date (open day)
    const dateInput = document.getElementById('res-date')
    fireEvent.change(dateInput, { target: { value: FUTURE_OPEN_DATE } })

    // Wait for time selector to be enabled
    const timeSel = document.getElementById('res-time')
    await waitFor(() => expect(timeSel).not.toBeDisabled())

    // Pick a time slot
    fireEvent.change(timeSel, { target: { value: '18:00' } })

    // Pick zone
    const zoneSel = document.getElementById('res-zone')
    fireEvent.change(zoneSel, { target: { value: 'interior' } })

    // Pick guests
    const guestsSel = document.getElementById('res-guests')
    fireEvent.change(guestsSel, { target: { value: '2' } })

    const form = document.querySelector('form[aria-label="Formulario de reserva"]')
    fireEvent.submit(form)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Buscando mesas/ })).toBeInTheDocument()
    )
  })

  test('changing a field after submit resets searching state', async () => {
    renderReservas()

    const dateInput = document.getElementById('res-date')
    fireEvent.change(dateInput, { target: { value: FUTURE_OPEN_DATE } })
    const timeSel = document.getElementById('res-time')
    await waitFor(() => expect(timeSel).not.toBeDisabled())
    fireEvent.change(timeSel, { target: { value: '18:00' } })
    fireEvent.change(document.getElementById('res-zone'), { target: { value: 'terraza' } })
    fireEvent.change(document.getElementById('res-guests'), { target: { value: '3' } })
    const form = document.querySelector('form[aria-label="Formulario de reserva"]')
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByRole('button', { name: /Buscando/ })).toBeInTheDocument())

    // Change guests — should reset searching state
    fireEvent.change(document.getElementById('res-guests'), { target: { value: '4' } })
    await waitFor(() => expect(screen.getByRole('button', { name: /^Buscar mesa$/ })).toBeInTheDocument())
  })

  test('renders WhatsApp button for groups', () => {
    renderReservas()
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toBeInTheDocument()
  })

  test('clears time selection when date changes and time no longer valid', async () => {
    renderReservas()
    const dateInput = document.getElementById('res-date')
    fireEvent.change(dateInput, { target: { value: FUTURE_OPEN_DATE } }) // Wednesday
    const timeSel = document.getElementById('res-time')
    await waitFor(() => expect(timeSel).not.toBeDisabled())
    fireEvent.change(timeSel, { target: { value: '18:00' } })
    // Change to a closed day — time should reset
    fireEvent.change(dateInput, { target: { value: FUTURE_CLOSED_DATE } }) // Monday
    expect(timeSel.value).toBe('')
  })
})
