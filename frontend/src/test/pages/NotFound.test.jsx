import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../helpers.jsx'
import App from '../../App.jsx'
import ErrorBoundary from '../../components/ErrorBoundary.jsx'

vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  disconnect() {}
})

describe('NotFound', () => {
  test('unknown route renders the 404 page with home and menu links', async () => {
    renderWithProviders(<App />, { initialEntries: ['/no-existe'] })
    expect(await screen.findByRole('heading', { level: 1, name: /sin pan/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Hacer pedido' })).toHaveAttribute('href', '/hacer-pedido')
    expect(document.title).toBe('Página no encontrada | La Casa Nostra')
  })
})

describe('ErrorBoundary', () => {
  test('renders a friendly fallback without leaking raw errors in production', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('DEV', false)
    function Boom() {
      throw new Error('secret internal detail')
    }
    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { level: 1, name: /algo no ha salido bien/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeInTheDocument()
    expect(screen.queryByText(/secret internal detail/)).toBeNull()
    vi.unstubAllEnvs()
  })
})
