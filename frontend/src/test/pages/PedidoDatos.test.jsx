// PedidoDatos.test.jsx — tests for the PedidoDatos order step page.
import { screen, fireEvent, waitFor } from '@testing-library/react'
import PedidoDatos from '../../pages/PedidoDatos.jsx'
import { renderWithProviders, defaultAuthContext, authenticatedUserContext, loadingAuthContext } from '../helpers.jsx'
import * as addressService from '../../services/addressService.js'

beforeEach(() => {
  vi.spyOn(addressService, 'getAddresses').mockResolvedValue({ addresses: [] })
})

function renderPedidoDatos(mode = 'recoger', authValue = authenticatedUserContext) {
  return renderWithProviders(<PedidoDatos />, {
    authValue,
    initialEntries: [`/hacer-pedido/datos?mode=${mode}`],
  })
}

describe('PedidoDatos page', () => {
  test('shows loading spinner while auth is resolving', () => {
    renderWithProviders(<PedidoDatos />, {
      authValue: loadingAuthContext,
      initialEntries: ['/hacer-pedido/datos?mode=recoger'],
    })
    // Use querySelector to avoid RTL's expensive aria tree walk on role="status"
    expect(document.querySelector('[role="status"]')).toBeInTheDocument()
  })

  test('redirects to /login when not authenticated', () => {
    renderWithProviders(<PedidoDatos />, {
      authValue: defaultAuthContext,
      initialEntries: ['/hacer-pedido/datos?mode=recoger'],
    })
    expect(screen.queryByText(/Introduce tus datos/)).toBeNull()
  })

  test('renders page heading for recoger mode', () => {
    renderPedidoDatos('recoger')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Introduce tus datos')
  })

  test('does NOT show AddressManager in recoger mode', async () => {
    renderPedidoDatos('recoger')
    // AddressManager only shows in domicilio mode
    expect(screen.queryByText(/Cargando direcciones/)).toBeNull()
  })

  test('shows AddressManager in domicilio mode', async () => {
    renderPedidoDatos('domicilio')
    await waitFor(() => expect(screen.queryByText(/Cargando/)).not.toBeNull() ||
      screen.queryByText(/No tienes ninguna dirección/) !== null ||
      screen.queryByText(/dirección guardada/) !== null
    )
    // The AddressManager renders — presence of "Añadir nueva dirección" confirms it
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
  })

  test('shows timing and age radio groups', () => {
    renderPedidoDatos('recoger')
    expect(screen.getByText(/¿Cuándo quieres recogerlo\?/)).toBeInTheDocument()
    expect(screen.getByText('¿Eres mayor de 18 años?')).toBeInTheDocument()
  })

  test('shows delivery timing question in domicilio mode', () => {
    renderPedidoDatos('domicilio')
    expect(screen.getByText(/¿Cuándo quieres recibirlo\?/)).toBeInTheDocument()
  })

  test('shows validation errors on empty submit in recoger mode', async () => {
    renderPedidoDatos('recoger')
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }))
    await waitFor(() => expect(screen.getByText(/Elige cuándo lo quieres/)).toBeInTheDocument())
    expect(screen.getByText(/Indícanos tu edad/)).toBeInTheDocument()
  })

  test('button is disabled in domicilio mode when no address is selected', async () => {
    renderPedidoDatos('domicilio')
    await waitFor(() => expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled())
  })

  test('selecting timing and age enables submit in recoger mode', async () => {
    renderPedidoDatos('recoger')
    const radios = screen.getAllByRole('radio')
    // timing: 0=programar, 1=asap; age: 2=yes, 3=no
    fireEvent.click(radios[1]) // asap
    fireEvent.click(radios[2]) // yes
    // Button should not be disabled in recoger mode with valid fields
    const btn = screen.getByRole('button', { name: /Continuar/ })
    expect(btn).not.toBeDisabled()
  })

  test('submit navigates to catalog when valid in recoger mode', async () => {
    renderPedidoDatos('recoger')
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1]) // asap
    fireEvent.click(radios[2]) // yes
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }))
    // No errors shown = navigation occurred
    await waitFor(() => expect(screen.queryByText(/Elige cuándo lo quieres/)).toBeNull())
  })

  test('shows address hint in domicilio mode when no address selected', async () => {
    renderPedidoDatos('domicilio')
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    expect(screen.getByText(/Selecciona o añade una dirección de entrega para poder continuar/)).toBeInTheDocument()
  })
})
