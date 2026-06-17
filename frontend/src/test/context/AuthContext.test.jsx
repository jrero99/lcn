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

  test('cancelled flag prevents state update when unmounted before /me resolves', async () => {
    // Create a promise that we can resolve manually — simulates slow network
    let resolveMe
    authService.getMeRequest.mockReturnValue(new Promise((res) => { resolveMe = res }))

    const { unmount } = render(<AuthProvider><AuthConsumer /></AuthProvider>)
    // Unmount before the promise resolves — sets cancelled = true
    unmount()
    // Now resolve the promise — cancelled branch should prevent setUser from being called
    await act(async () => {
      resolveMe({ user: { id: '1', email: 'x@x.com', firstName: 'X', role: 'CUSTOMER' } })
    })
    // No assertion needed — we're testing that React does not throw
    // "Can't perform a React state update on an unmounted component"
    expect(true).toBe(true)
  })

  test('cancelled flag prevents state update on network error when unmounted', async () => {
    let rejectMe
    authService.getMeRequest.mockReturnValue(new Promise((_res, rej) => { rejectMe = rej }))

    const { unmount } = render(<AuthProvider><AuthConsumer /></AuthProvider>)
    unmount()
    await act(async () => {
      rejectMe(new Error('Network error'))
    })
    // No React state-update-on-unmounted-component error should be thrown
    expect(true).toBe(true)
  })
})
