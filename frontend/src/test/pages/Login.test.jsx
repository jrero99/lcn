// Login.test.jsx — tests for the Login page.
import { screen, fireEvent, waitFor } from '@testing-library/react'
import Login from '../../pages/Login.jsx'
import * as authService from '../../services/authService.js'
import { renderWithProviders, defaultAuthContext, authenticatedUserContext } from '../helpers.jsx'

// GoogleSignInButton uses VITE_GOOGLE_CLIENT_ID which is undefined in test env,
// so the component returns null — no mock needed.

beforeEach(() => {
  vi.spyOn(authService, 'loginRequest').mockResolvedValue({})
})

describe('Login page', () => {
  test('renders email and password inputs', () => {
    renderWithProviders(<Login />, { authValue: defaultAuthContext })
    expect(screen.getByPlaceholderText('Tu correo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument()
  })

  function submitForm() {
    const form = document.querySelector('.datos-form')
    fireEvent.submit(form)
  }

  test('shows validation error when email is empty', async () => {
    renderWithProviders(<Login />, { authValue: defaultAuthContext })
    submitForm()
    // The error message is in a role="alert" element; the subtitle also has the same text
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.some((el) => el.textContent.includes('Introduce tu correo electrónico'))).toBe(true)
    })
  })

  test('shows validation error for invalid email format', async () => {
    renderWithProviders(<Login />, { authValue: defaultAuthContext })
    fireEvent.change(screen.getByPlaceholderText('Tu correo'), { target: { value: 'notanemail' } })
    submitForm()
    await waitFor(() => expect(screen.getByText(/formato válido/)).toBeInTheDocument())
  })

  test('shows validation error when password is empty', async () => {
    renderWithProviders(<Login />, { authValue: defaultAuthContext })
    fireEvent.change(screen.getByPlaceholderText('Tu correo'), { target: { value: 'a@b.com' } })
    submitForm()
    await waitFor(() => expect(screen.getByText('Introduce tu contraseña')).toBeInTheDocument())
  })

  test('calls loginRequest on valid submit', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<Login />, { authValue: { ...defaultAuthContext, login } })
    fireEvent.change(screen.getByPlaceholderText('Tu correo'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'password123' } })
    submitForm()
    await waitFor(() => expect(authService.loginRequest).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
    }))
  })

  test('calls context login() after successful loginRequest', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<Login />, { authValue: { ...defaultAuthContext, login } })
    fireEvent.change(screen.getByPlaceholderText('Tu correo'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pass1234' } })
    submitForm()
    await waitFor(() => expect(login).toHaveBeenCalled())
  })

  test('shows server error message on login failure', async () => {
    authService.loginRequest.mockRejectedValue(new Error('Credenciales incorrectas'))
    renderWithProviders(<Login />, { authValue: defaultAuthContext })
    fireEvent.change(screen.getByPlaceholderText('Tu correo'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'wrongpass' } })
    submitForm()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Credenciales incorrectas'))
  })

  test('clears email error when user types', async () => {
    renderWithProviders(<Login />, { authValue: defaultAuthContext })
    submitForm()
    // Wait for the alert to appear
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.some((el) => el.textContent.includes('Introduce tu correo electrónico'))).toBe(true)
    })
    fireEvent.change(screen.getByPlaceholderText('Tu correo'), { target: { value: 'x@x.com' } })
    // After typing, the alert role element with that message should be gone
    await waitFor(() => {
      const alerts = screen.queryAllByRole('alert')
      expect(alerts.every((el) => !el.textContent.includes('Introduce tu correo electrónico'))).toBe(true)
    })
  })

  test('disables submit button while submitting', async () => {
    authService.loginRequest.mockReturnValue(new Promise(() => {})) // never resolves
    renderWithProviders(<Login />, { authValue: defaultAuthContext })
    fireEvent.change(screen.getByPlaceholderText('Tu correo'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pass1234' } })
    submitForm()
    await waitFor(() => expect(screen.getByRole('button', { name: /Entrando/ })).toBeDisabled())
  })

  test('renders link to /registro', () => {
    renderWithProviders(<Login />, { authValue: defaultAuthContext })
    expect(screen.getByRole('link', { name: 'Regístrate' })).toBeInTheDocument()
  })
})
