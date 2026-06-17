// Header.test.jsx — tests for the site header component.
import { screen, fireEvent } from '@testing-library/react'
import Header from '../../components/Header.jsx'
import { renderWithProviders, defaultAuthContext, authenticatedUserContext, adminUserContext, loadingAuthContext } from '../helpers.jsx'

describe('Header', () => {
  test('renders logo link', () => {
    renderWithProviders(<Header />, { authValue: defaultAuthContext })
    expect(screen.getByRole('link', { name: /La Casa Nostra/i })).toBeInTheDocument()
  })

  test('shows "Iniciar Sesión" link when not authenticated', () => {
    renderWithProviders(<Header />, { authValue: defaultAuthContext })
    expect(screen.getByRole('link', { name: 'Iniciar Sesión' })).toBeInTheDocument()
  })

  test('shows greeting and "Cerrar sesión" when authenticated', () => {
    renderWithProviders(<Header />, { authValue: authenticatedUserContext })
    expect(screen.getByText(/Hola, Test/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  test('shows "Panel" link for admin users', () => {
    renderWithProviders(<Header />, { authValue: adminUserContext })
    expect(screen.getByRole('link', { name: 'Panel' })).toBeInTheDocument()
  })

  test('does not show "Panel" link for regular users', () => {
    renderWithProviders(<Header />, { authValue: authenticatedUserContext })
    expect(screen.queryByRole('link', { name: 'Panel' })).toBeNull()
  })

  test('renders nothing in auth area while loading', () => {
    renderWithProviders(<Header />, { authValue: loadingAuthContext })
    // Neither "Iniciar Sesión" nor the user greeting should appear
    expect(screen.queryByRole('link', { name: 'Iniciar Sesión' })).toBeNull()
    expect(screen.queryByText(/Hola,/)).toBeNull()
  })

  test('hamburger button toggles aria-expanded', () => {
    renderWithProviders(<Header />, { authValue: defaultAuthContext })
    const hamburger = screen.getByRole('button', { name: /Obrir menú/i })
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(hamburger)
    expect(hamburger).toHaveAttribute('aria-expanded', 'true')
  })

  test('pressing Escape closes nav when open', () => {
    renderWithProviders(<Header />, { authValue: defaultAuthContext })
    const hamburger = screen.getByRole('button', { name: /Obrir menú/i })
    fireEvent.click(hamburger)
    expect(hamburger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  })

  test('renders "Hacer pedido" and "Reservar" action links', () => {
    renderWithProviders(<Header />, { authValue: defaultAuthContext })
    expect(screen.getByRole('link', { name: 'Hacer pedido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reservar' })).toBeInTheDocument()
  })

  test('calls logout and navigates to / when "Cerrar sesión" is clicked', async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <Header />,
      { authValue: { ...authenticatedUserContext, logout } }
    )
    const btn = screen.getByRole('button', { name: 'Cerrar sesión' })
    fireEvent.click(btn)
    // Wait for the async handler
    await vi.waitFor(() => expect(logout).toHaveBeenCalled())
  })

  test('shows "Mis direcciones" link when authenticated', () => {
    renderWithProviders(<Header />, { authValue: authenticatedUserContext })
    expect(screen.getByRole('link', { name: 'Mis direcciones' })).toBeInTheDocument()
  })
})
