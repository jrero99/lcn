// staticSite.test.jsx — public static site (all feature flags off).
//
// The rest of the suite runs with every flag on (see vite.config.js test.env).
// Here we mock the flags module to verify the static build: no orders, no
// login, no backend calls, and contact-based Reservas / Trabaja.
import { screen, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from './helpers.jsx'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Reservas from '../pages/Reservas.jsx'
import Trabaja from '../pages/Trabaja.jsx'
import App from '../App.jsx'
import { AuthProvider, useAuth } from '../context/AuthContext.jsx'
import { fetchCatalog } from '../services/catalogService.js'
import { STATIC_CATALOG } from '../data/staticCatalog.js'
import { BUSINESS } from '../data/business.js'

vi.mock('../config/features.js', () => ({
  AUTH_ENABLED: false,
  ORDERS_ENABLED: false,
  ONLINE_FORMS_ENABLED: false,
}))

let fetchSpy
beforeEach(() => {
  // Home uses IntersectionObserver (not implemented in jsdom).
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  })
  fetchSpy = vi.fn(() => Promise.reject(new Error('no backend on the static site')))
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('static site — navigation', () => {
  test('Header hides login and order links but keeps Reservar', () => {
    renderWithProviders(<Header />)
    expect(screen.queryByRole('link', { name: 'Iniciar Sesión' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Hacer pedido' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Reservar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'La Carta' })).toBeInTheDocument()
  })

  test('Footer hides "Hacer pedido" and shows the business phone', () => {
    renderWithProviders(<Footer />)
    expect(screen.queryByRole('link', { name: 'Hacer pedido' })).toBeNull()
    expect(screen.getByRole('link', { name: BUSINESS.phone })).toHaveAttribute(
      'href',
      `tel:${BUSINESS.phone.replace(/\s/g, '')}`,
    )
  })

  test.each(['/login', '/registro', '/hacer-pedido', '/hacer-pedido/confirmar', '/mis-direcciones', '/adminoffice', '/no-existe'])(
    '%s shows the 404 page',
    async (path) => {
      renderWithProviders(<App />, { initialEntries: [path] })
      expect(await screen.findByRole('heading', { level: 1, name: /sin pan/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver la carta' })).toHaveAttribute('href', '/carta')
    },
  )
})

describe('static site — no backend calls', () => {
  test('AuthProvider does not call /api/auth/me and is not loading', async () => {
    function Probe() {
      const { loading, isAuthenticated } = useAuth()
      return <p>{`loading:${loading} auth:${isAuthenticated}`}</p>
    }
    render(
      <MemoryRouter>
        <AuthProvider><Probe /></AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('loading:false auth:false')).toBeInTheDocument()
    await waitFor(() => expect(fetchSpy).not.toHaveBeenCalled())
  })

  test('fetchCatalog returns the bundled static catalog without fetching', async () => {
    const data = await fetchCatalog()
    expect(data).toBe(STATIC_CATALOG)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('static catalog has the same shape as the API, with allergens', () => {
    expect(STATIC_CATALOG.length).toBeGreaterThan(0)
    for (const category of STATIC_CATALOG) {
      expect(category).toMatchObject({ id: expect.any(String), label: expect.any(String), heading: expect.any(String) })
      for (const product of category.products) {
        expect(typeof product.price).toBe('number')
        expect(Array.isArray(product.allergens)).toBe(true)
      }
    }
  })
})

describe('static site — contact-based forms', () => {
  test('Reservas shows WhatsApp and phone instead of the booking form', () => {
    renderWithProviders(<Reservas />)
    expect(screen.queryByRole('form', { name: /reserva/i })).toBeNull()
    expect(screen.getByRole('link', { name: /WhatsApp/i }).getAttribute('href'))
      .toMatch(new RegExp(`^https://wa\\.me/${BUSINESS.whatsapp}\\?text=`))
    expect(screen.getByRole('link', { name: /Llamar/i })).toHaveAttribute('href', expect.stringMatching(/^tel:/))
  })

  test('Trabaja offers a mailto instead of a form that drops the CV', () => {
    renderWithProviders(<Trabaja />)
    expect(screen.queryByRole('form', { name: /candidatura/i })).toBeNull()
    expect(screen.getByRole('link', { name: 'Enviar CV por email' }).getAttribute('href'))
      .toMatch(new RegExp(`^mailto:${BUSINESS.email}`))
  })
})
