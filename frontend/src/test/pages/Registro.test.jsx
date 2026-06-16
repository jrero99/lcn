// Registro.test.jsx — tests for the registration page.
import { screen, fireEvent, waitFor } from '@testing-library/react'
import Registro from '../../pages/Registro.jsx'
import * as authService from '../../services/authService.js'
import { renderWithProviders, defaultAuthContext } from '../helpers.jsx'

beforeEach(() => {
  vi.spyOn(authService, 'registerRequest').mockResolvedValue({})
})

function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Maria' } })
  fireEvent.change(screen.getByPlaceholderText('Apellidos'), { target: { value: 'García' } })
  fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'maria@test.com' } })
  fireEvent.change(screen.getByPlaceholderText('Número de teléfono'), { target: { value: '612345678' } })
  fireEvent.change(screen.getByPlaceholderText(/mín. 8 caracteres/), { target: { value: 'securepass' } })
  // Accept required checkboxes
  const checkboxes = screen.getAllByRole('checkbox')
  // condiciones is index 1, privacidad is index 2 (mayoria=0, condiciones=1, privacidad=2, comerciales=3)
  fireEvent.click(checkboxes[1]) // condiciones
  fireEvent.click(checkboxes[2]) // privacidad
}

describe('Registro page', () => {
  test('renders all required form fields', () => {
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    expect(screen.getByPlaceholderText('Nombre')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Apellidos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Número de teléfono')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/mín. 8 caracteres/)).toBeInTheDocument()
  })

  test('shows error when nombre is empty', async () => {
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    fireEvent.click(screen.getByRole('button', { name: /Crea tu cuenta ahora/ }))
    await waitFor(() => expect(screen.getByText('Introduce tu nombre')).toBeInTheDocument())
  })

  test('shows error when email is invalid', async () => {
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Maria' } })
    fireEvent.change(screen.getByPlaceholderText('Apellidos'), { target: { value: 'García' } })
    fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'notvalid' } })
    fireEvent.click(screen.getByRole('button', { name: /Crea tu cuenta ahora/ }))
    await waitFor(() => expect(screen.getByText(/formato válido/)).toBeInTheDocument())
  })

  test('shows error when password is too short', async () => {
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Maria' } })
    fireEvent.change(screen.getByPlaceholderText('Apellidos'), { target: { value: 'García' } })
    fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/mín. 8 caracteres/), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /Crea tu cuenta ahora/ }))
    await waitFor(() => expect(screen.getByText(/al menos 8 caracteres/)).toBeInTheDocument())
  })

  test('shows error when phone is invalid', async () => {
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Maria' } })
    fireEvent.change(screen.getByPlaceholderText('Apellidos'), { target: { value: 'García' } })
    fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/mín. 8 caracteres/), { target: { value: 'pass1234' } })
    fireEvent.change(screen.getByPlaceholderText('Número de teléfono'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /Crea tu cuenta ahora/ }))
    await waitFor(() => expect(screen.getByText(/teléfono válido/)).toBeInTheDocument())
  })

  test('shows error when condiciones not accepted', async () => {
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Maria' } })
    fireEvent.change(screen.getByPlaceholderText('Apellidos'), { target: { value: 'García' } })
    fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/mín. 8 caracteres/), { target: { value: 'pass1234' } })
    fireEvent.change(screen.getByPlaceholderText('Número de teléfono'), { target: { value: '612345678' } })
    const form = document.querySelector('.datos-form')
    fireEvent.submit(form)
    // The error message is inside a <p role="alert"> — look for it specifically
    await waitFor(() => expect(screen.getByText('Debes aceptar las condiciones de venta')).toBeInTheDocument())
  })

  test('calls registerRequest on valid form submit', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<Registro />, { authValue: { ...defaultAuthContext, login } })
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /Crea tu cuenta ahora/ }))
    await waitFor(() => expect(authService.registerRequest).toHaveBeenCalled())
  })

  test('shows welcome modal after successful registration', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<Registro />, { authValue: { ...defaultAuthContext, login } })
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /Crea tu cuenta ahora/ }))
    await waitFor(() => expect(screen.getByText('¡Bienvenido/a!')).toBeInTheDocument())
  })

  test('shows server error on registration failure', async () => {
    authService.registerRequest.mockRejectedValue(new Error('Ya existe una cuenta con ese correo electrónico.'))
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /Crea tu cuenta ahora/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una cuenta'))
  })

  test('clears field errors when user types', async () => {
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    fireEvent.click(screen.getByRole('button', { name: /Crea tu cuenta ahora/ }))
    await waitFor(() => expect(screen.getByText('Introduce tu nombre')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Carlos' } })
    await waitFor(() => expect(screen.queryByText('Introduce tu nombre')).toBeNull())
  })

  test('renders link to /login', () => {
    renderWithProviders(<Registro />, { authValue: defaultAuthContext })
    expect(screen.getByRole('link', { name: 'Identifícate' })).toBeInTheDocument()
  })
})
