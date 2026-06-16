// Test helpers — shared utilities for wrapping components with providers.
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'

/**
 * Default auth context value — unauthenticated user, loading resolved.
 */
export const defaultAuthContext = {
  isAuthenticated: false,
  user: null,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}

/**
 * Auth context for an authenticated regular user.
 */
export const authenticatedUserContext = {
  isAuthenticated: true,
  user: { id: 'u1', email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'CUSTOMER' },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}

/**
 * Auth context for an authenticated admin user.
 */
export const adminUserContext = {
  isAuthenticated: true,
  user: { id: 'u2', email: 'admin@lcn.com', firstName: 'Admin', lastName: 'LCN', role: 'ADMIN' },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}

/**
 * Auth context while loading (GET /api/auth/me in-flight).
 */
export const loadingAuthContext = {
  isAuthenticated: false,
  user: null,
  loading: true,
  login: vi.fn(),
  logout: vi.fn(),
}

/**
 * Renders a component wrapped in MemoryRouter and a custom AuthContext value.
 *
 * @param {JSX.Element} ui
 * @param {object} options
 * @param {string[]} options.initialEntries  MemoryRouter initial entries (default: ['/'])
 * @param {object} options.authValue         AuthContext value (default: unauthenticated)
 * @param {object} options.renderOptions     Extra options passed to render()
 */
export function renderWithProviders(ui, {
  initialEntries = ['/'],
  authValue = defaultAuthContext,
  ...renderOptions
} = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <AuthContext.Provider value={authValue}>
          {children}
        </AuthContext.Provider>
      </MemoryRouter>
    )
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Creates a minimal fetch mock that returns the given data with a 200 status.
 */
export function mockFetchOk(data) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  })
}

/**
 * Creates a fetch mock that returns an error response.
 */
export function mockFetchError(status, data = {}) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: `Error ${status}`,
    json: () => Promise.resolve(data),
  })
}
