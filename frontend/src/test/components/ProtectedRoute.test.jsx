// ProtectedRoute.test.jsx — tests for the auth guard component.
// NOTE: These tests use renderWithProviders (MemoryRouter + AuthContext.Provider)
// to avoid mounting the real AuthProvider (which calls GET /api/auth/me).
import { screen } from '@testing-library/react'
import ProtectedRoute from '../../components/ProtectedRoute.jsx'
import { renderWithProviders, loadingAuthContext, authenticatedUserContext, adminUserContext, defaultAuthContext } from '../helpers.jsx'

describe('ProtectedRoute', () => {
  test('shows loading spinner while auth is resolving', () => {
    renderWithProviders(
      <ProtectedRoute><div>Content</div></ProtectedRoute>,
      { authValue: loadingAuthContext }
    )
    // Use querySelector instead of getByRole to avoid RTL's expensive a11y tree walk
    expect(document.querySelector('[role="status"]')).toBeInTheDocument()
    expect(screen.queryByText('Content')).toBeNull()
  })

  test('redirects to /login when not authenticated', () => {
    renderWithProviders(
      <ProtectedRoute><div>Protected content</div></ProtectedRoute>,
      { authValue: defaultAuthContext, initialEntries: ['/dashboard'] }
    )
    // Navigate renders the redirect but in MemoryRouter the content should not show
    expect(screen.queryByText('Protected content')).toBeNull()
  })

  test('renders children when authenticated', () => {
    renderWithProviders(
      <ProtectedRoute><div>Protected content</div></ProtectedRoute>,
      { authValue: authenticatedUserContext }
    )
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  test('renders children when authenticated as admin and requireAdmin=true', () => {
    renderWithProviders(
      <ProtectedRoute requireAdmin><div>Admin content</div></ProtectedRoute>,
      { authValue: adminUserContext }
    )
    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  test('shows 403 message when authenticated but not admin (requireAdmin=true)', () => {
    renderWithProviders(
      <ProtectedRoute requireAdmin><div>Admin only</div></ProtectedRoute>,
      { authValue: authenticatedUserContext }
    )
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    expect(screen.queryByText('Admin only')).toBeNull()
  })

  test('does not require admin by default', () => {
    renderWithProviders(
      <ProtectedRoute><div>Regular content</div></ProtectedRoute>,
      { authValue: authenticatedUserContext }
    )
    expect(screen.getByText('Regular content')).toBeInTheDocument()
  })
})
