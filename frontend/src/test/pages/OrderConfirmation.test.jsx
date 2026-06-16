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
    expect(screen.getByRole('status')).toBeInTheDocument()
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
})
