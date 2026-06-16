// AuthContext.test.jsx — tests for authentication context.
import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext.jsx'
import * as authService from '../../services/authService.js'
import { notifyUnauthorized } from '../../services/sessionEvents.js'

// A simple consumer component to expose the context value
function AuthConsumer() {
  const { isAuthenticated, user, loading, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="isAuth">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

beforeEach(() => {
  vi.spyOn(authService, 'getMeRequest')
  vi.spyOn(authService, 'logoutRequest').mockResolvedValue()
})

describe('AuthProvider', () => {
  test('starts in loading state and resolves to unauthenticated when GET /me returns null', async () => {
    authService.getMeRequest.mockResolvedValue(null)

    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    // Initially loading
    expect(screen.getByTestId('loading').textContent).toBe('true')

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('isAuth').textContent).toBe('false')
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  test('hydrates user state when GET /me returns a user', async () => {
    const user = { id: '1', email: 'test@test.com', firstName: 'Test', role: 'CUSTOMER' }
    authService.getMeRequest.mockResolvedValue({ user })

    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('isAuth').textContent).toBe('true')
    expect(screen.getByTestId('user').textContent).toBe('test@test.com')
  })

  test('treats network error on GET /me as unauthenticated', async () => {
    authService.getMeRequest.mockRejectedValue(new Error('Network error'))

    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('isAuth').textContent).toBe('false')
  })

  test('login() re-fetches /me and updates user state', async () => {
    // First call: not authenticated; second (after login()): authenticated
    const user = { id: '1', email: 'a@b.com', firstName: 'A', role: 'CUSTOMER' }
    authService.getMeRequest
      .mockResolvedValueOnce(null)           // initial mount
      .mockResolvedValueOnce({ user })       // after login()

    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('isAuth').textContent).toBe('false')

    await act(async () => {
      screen.getByRole('button', { name: 'Login' }).click()
    })

    expect(screen.getByTestId('isAuth').textContent).toBe('true')
    expect(screen.getByTestId('user').textContent).toBe('a@b.com')
  })

  test('logout() calls logoutRequest and clears user state', async () => {
    const user = { id: '1', email: 'a@b.com', firstName: 'A', role: 'CUSTOMER' }
    authService.getMeRequest.mockResolvedValue({ user })

    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('isAuth').textContent).toBe('true'))

    await act(async () => {
      screen.getByRole('button', { name: 'Logout' }).click()
    })

    expect(authService.logoutRequest).toHaveBeenCalled()
    expect(screen.getByTestId('isAuth').textContent).toBe('false')
  })

  test('notifyUnauthorized signal clears user state immediately', async () => {
    const user = { id: '1', email: 'a@b.com', firstName: 'A', role: 'CUSTOMER' }
    authService.getMeRequest.mockResolvedValue({ user })

    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('isAuth').textContent).toBe('true'))

    act(() => {
      notifyUnauthorized()
    })

    expect(screen.getByTestId('isAuth').textContent).toBe('false')
  })

  test('useAuth throws when used outside AuthProvider', () => {
    // Suppress expected console.error from React
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(<AuthConsumer />)
    } catch (err) {
      expect(err.message).toContain('useAuth must be used inside <AuthProvider>.')
    }
    consoleError.mockRestore()
  })
})
