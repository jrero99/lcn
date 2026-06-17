// OrderConfirmation.test.jsx — tests for the order confirmation page.
import { screen, fireEvent, waitFor } from '@testing-library/react'
import OrderConfirmation from '../../pages/OrderConfirmation.jsx'
import { renderWithProviders, defaultAuthContext, authenticatedUserContext, loadingAuthContext } from '../helpers.jsx'
import * as orderService from '../../services/orderService.js'

const validNavState = {
  mode: 'recoger',
  timing: 'asap',
  total: 15.5,
  items: [
    { id: 'p1', name: 'Bocadillo Test', unitPrice: 7.75, quantity: 2, lineTotal: 15.5, options: [], removedIngredients: [], notes: '' },
  ],
  addressId: null,
  addressLabel: null,
}

const validDeliveryState = {
  ...validNavState,
  mode: 'domicilio',
  addressId: 'addr-1',
  addressLabel: 'Carrer Test, 1',
}

beforeEach(() => {
  vi.spyOn(orderService, 'createOrder').mockResolvedValue({ orderId: 'o123' })
})

function renderConfirmation(navState, authValue = authenticatedUserContext) {
  // MemoryRouter accepts location objects with pathname + state
  const location = navState
    ? { pathname: '/hacer-pedido/confirmar', state: navState }
    : '/hacer-pedido/confirmar'
  return renderWithProviders(<OrderConfirmation />, {
    authValue,
    initialEntries: [location],
  })
}

describe('OrderConfirmation page', () => {
  test('shows spinner while auth is loading', () => {
    renderWithProviders(<OrderConfirmation />, {
      authValue: loadingAuthContext,
      initialEntries: [{ pathname: '/confirmar', state: validNavState }],
    })
    // Use querySelector to avoid the RTL aria-tree walk on role="status" aria-live="polite"
    // (Vitest 4.1.9 + jsdom 29 OOM bug)
    expect(document.querySelector('[role="status"]')).toBeInTheDocument()
  })

  test('redirects to /hacer-pedido when state is missing (BUG-4)', () => {
    renderWithProviders(<OrderConfirmation />, {
      authValue: authenticatedUserContext,
      initialEntries: ['/hacer-pedido/confirmar'],
    })
    // Navigate renders redirect — content not shown
    expect(screen.queryByText(/Revisa tu comanda/)).toBeNull()
  })

  test('redirects to /login when not authenticated and state is valid', () => {
    renderConfirmation(validNavState, defaultAuthContext)
    expect(screen.queryByText(/Revisa tu comanda/)).toBeNull()
  })

  test('renders the confirmation page with items', () => {
    renderConfirmation(validNavState)
    expect(screen.getByText(/Revisa tu comanda/)).toBeInTheDocument()
    expect(screen.getByText(/Bocadillo Test/)).toBeInTheDocument()
    // Both line total and order total show the same value — use getAllByText
    expect(screen.getAllByText('15,50 €').length).toBeGreaterThanOrEqual(1)
  })

  test('shows pickup info in recoger mode', () => {
    renderConfirmation(validNavState)
    expect(screen.getByText(/Podràs recollir-la al local/)).toBeInTheDocument()
  })

  test('shows delivery info in domicilio mode', () => {
    renderConfirmation(validDeliveryState)
    expect(screen.getByText(/Carrer Test, 1/)).toBeInTheDocument()
  })

  test('phone input is empty and button has aria-disabled when user has no phone', () => {
    // When user has no phone, the input starts empty; button has aria-disabled
    const authWithNoPhone = {
      ...authenticatedUserContext,
      user: { ...authenticatedUserContext.user, phone: '' },
    }
    renderConfirmation(validNavState, authWithNoPhone)
    const phoneInput = screen.getByRole('textbox', { name: /Teléfono de contacto/ })
    expect(phoneInput).toHaveValue('')
  })

  test('shows phone hint text below the input', () => {
    renderConfirmation(validNavState)
    // The component shows a hint below the phone input
    expect(screen.getByText(/Solo se usará para gestionar este pedido/)).toBeInTheDocument()
  })

  test('calls createOrder when phone is entered and form submitted', async () => {
    renderConfirmation(validNavState)
    // Fill in phone
    const phoneInput = screen.getByRole('textbox', { name: /Teléfono de contacto/ })
    fireEvent.change(phoneInput, { target: { value: '612345678' } })
    // Submit the form
    const form = document.querySelector('.confirm-submit-form')
    fireEvent.submit(form)
    await waitFor(() => expect(orderService.createOrder).toHaveBeenCalled())
  })

  test('shows success modal after successful order submission', async () => {
    renderConfirmation(validNavState)
    const phoneInput = screen.getByRole('textbox', { name: /Teléfono de contacto/ })
    fireEvent.change(phoneInput, { target: { value: '612345678' } })
    const form = document.querySelector('.confirm-submit-form')
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByText('¡GRACIAS POR TU PEDIDO!')).toBeInTheDocument())
  })

  test('shows error modal on order failure', async () => {
    orderService.createOrder.mockRejectedValue(new Error('Stock agotado'))
    renderConfirmation(validNavState)
    const phoneInput = screen.getByRole('textbox', { name: /Teléfono de contacto/ })
    fireEvent.change(phoneInput, { target: { value: '612345678' } })
    const form = document.querySelector('.confirm-submit-form')
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByText(/No se ha podido enviar el pedido/)).toBeInTheDocument())
    expect(screen.getByText('Stock agotado')).toBeInTheDocument()
  })

  test('shows customized items with options in the list', () => {
    const stateWithCustom = {
      ...validNavState,
      items: [{
        id: 'p1', name: 'Bocadillo Especial', unitPrice: 10, quantity: 1, lineTotal: 10,
        options: [{ groupLabel: 'Tamaño', choiceLabel: 'Grande' }],
        removedIngredients: ['cebolla'],
        notes: 'Sin sal',
      }],
    }
    renderConfirmation(stateWithCustom)
    expect(screen.getByText(/Tamaño:/)).toBeInTheDocument()
    expect(screen.getByText('Grande')).toBeInTheDocument()
    expect(screen.getByText(/cebolla/)).toBeInTheDocument()
    expect(screen.getByText(/Sin sal/)).toBeInTheDocument()
  })

  test('renders "Modificar pedido" and "Volver al inicio" links', () => {
    renderConfirmation(validNavState)
    expect(screen.getByRole('link', { name: /Modificar pedido/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toBeInTheDocument()
  })

  test('shows phone validation error for invalid phone format', async () => {
    renderConfirmation(validNavState)
    const phoneInput = screen.getByRole('textbox', { name: /Teléfono de contacto/ })
    // Enter an invalid phone (too short, not a Spanish number)
    fireEvent.change(phoneInput, { target: { value: '123' } })
    const form = document.querySelector('.confirm-submit-form')
    fireEvent.submit(form)
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.some((el) => el.textContent.includes('teléfono de teléfono español válido') ||
        el.textContent.includes('español válido'))).toBe(true)
    })
  })

  test('shows phone validation error for empty phone', async () => {
    renderConfirmation(validNavState)
    // Do NOT fill in the phone — submit empty form
    const form = document.querySelector('.confirm-submit-form')
    fireEvent.submit(form)
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.some((el) => el.textContent.includes('número de teléfono'))).toBe(true)
    })
  })

  test('closing the error modal hides it', async () => {
    orderService.createOrder.mockRejectedValue(new Error('Network failure'))
    renderConfirmation(validNavState)
    const phoneInput = screen.getByRole('textbox', { name: /Teléfono de contacto/ })
    fireEvent.change(phoneInput, { target: { value: '612345678' } })
    const form = document.querySelector('.confirm-submit-form')
    fireEvent.submit(form)
    // Wait for error modal to appear
    await waitFor(() => expect(screen.getByText(/No se ha podido enviar el pedido/)).toBeInTheDocument())
    // Close the error modal by clicking the X button (aria-hidden backdrop)
    const closeBtn = screen.getByRole('button', { name: /Cerrar/i, hidden: true })
    fireEvent.click(closeBtn)
    // Modal should close
    await waitFor(() => expect(screen.queryByText(/No se ha podido enviar el pedido/)).toBeNull())
  })

  test('closing success modal triggers navigation away', async () => {
    renderConfirmation(validNavState)
    const phoneInput = screen.getByRole('textbox', { name: /Teléfono de contacto/ })
    fireEvent.change(phoneInput, { target: { value: '612345678' } })
    const form = document.querySelector('.confirm-submit-form')
    fireEvent.submit(form)
    // Wait for success modal
    await waitFor(() => expect(screen.getByText('¡GRACIAS POR TU PEDIDO!')).toBeInTheDocument())
    // Close it — triggers navigate('/', { replace: true })
    const closeBtn = screen.getByRole('button', { name: /Cerrar/i, hidden: true })
    fireEvent.click(closeBtn)
    // After navigate the component unmounts or redirects — modal should close
    await waitFor(() => expect(screen.queryByText('¡GRACIAS POR TU PEDIDO!')).toBeNull())
  })

  test('buildOrderItems includes selectedOptions and removedIngredients when present', async () => {
    // Items with selectedOptions and removedIngredients (lines 136, 139 in buildOrderItems)
    const stateWithCustomOrder = {
      ...validNavState,
      items: [{
        id: 'p1', name: 'Bocadillo Test',
        unitPrice: 7.75, quantity: 1, lineTotal: 7.75,
        options: [{ groupLabel: 'Tamaño', choiceLabel: 'Grande' }],
        selectedOptions: { g1: 'c2' },      // non-empty → included in order
        removedIngredients: ['cebolla'],    // non-empty → included in order
        notes: '',
      }],
    }
    renderConfirmation(stateWithCustomOrder)
    const phoneInput = screen.getByRole('textbox', { name: /Teléfono de contacto/ })
    fireEvent.change(phoneInput, { target: { value: '612345678' } })
    const form = document.querySelector('.confirm-submit-form')
    fireEvent.submit(form)
    await waitFor(() => expect(orderService.createOrder).toHaveBeenCalled())
    // Verify the order payload includes selectedOptions and removedIngredients
    const call = orderService.createOrder.mock.calls[0][0]
    expect(call.items[0].selectedOptions).toEqual({ g1: 'c2' })
    expect(call.items[0].removedIngredients).toEqual(['cebolla'])
  })
})
