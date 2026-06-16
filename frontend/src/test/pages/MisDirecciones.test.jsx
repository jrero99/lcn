// MisDirecciones.test.jsx — tests for the "Mis direcciones" account page.
import { screen, waitFor } from '@testing-library/react'
import MisDirecciones from '../../pages/MisDirecciones.jsx'
import { renderWithProviders, defaultAuthContext, authenticatedUserContext, loadingAuthContext } from '../helpers.jsx'
import * as addressService from '../../services/addressService.js'

beforeEach(() => {
  vi.spyOn(addressService, 'getAddresses').mockResolvedValue({ addresses: [] })
})

describe('MisDirecciones page', () => {
  test('shows loading spinner while auth is resolving', () => {
    renderWithProviders(<MisDirecciones />, { authValue: loadingAuthContext })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  test('redirects to /login when not authenticated', () => {
    renderWithProviders(<MisDirecciones />, {
      authValue: defaultAuthContext,
      initialEntries: ['/mis-direcciones'],
    })
    // Should redirect; the page content should not render
    expect(screen.queryByText('Mis direcciones')).toBeNull()
  })

  test('renders the page heading and AddressManager when authenticated', async () => {
    renderWithProviders(<MisDirecciones />, { authValue: authenticatedUserContext })
    expect(screen.getByRole('heading', { level: 1, name: 'Mis direcciones' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/No tienes ninguna dirección guardada/)).toBeInTheDocument())
  })

  test('renders the page subtitle', () => {
    renderWithProviders(<MisDirecciones />, { authValue: authenticatedUserContext })
    expect(screen.getByText(/Gestiona las direcciones de entrega/)).toBeInTheDocument()
  })
})
