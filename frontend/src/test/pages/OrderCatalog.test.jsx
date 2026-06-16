// OrderCatalog.test.jsx — tests for the order catalog page.
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OrderCatalog from '../../pages/OrderCatalog.jsx'
import * as catalogService from '../../services/catalogService.js'

const mockCatalog = [
  {
    id: 'cat1',
    slug: 'bocadillos',
    label: 'Bocadillos',
    heading: 'Nuestros Bocadillos',
    products: [
      {
        id: 'p1',
        name: 'Bocadillo de Jamón',
        description: 'Con jamón ibérico',
        price: 7.5,
        allergens: ['gluten'],
        options: [],
      },
      {
        id: 'p2',
        name: 'Bocadillo Vegetal',
        description: 'Sin carne',
        price: 6.0,
        allergens: [],
        options: [],
      },
    ],
  },
]

function renderCatalog(mode = 'recoger', navState = null) {
  const initialEntries = navState
    ? [{ pathname: `/hacer-pedido/${mode}`, state: navState }]
    : [`/hacer-pedido/${mode}`]

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path={`/hacer-pedido/${mode}`} element={<OrderCatalog mode={mode} />} />
        <Route path="/hacer-pedido/datos" element={<div>Datos page</div>} />
        <Route path="/hacer-pedido/confirmar" element={<div>Confirm page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.spyOn(catalogService, 'fetchCatalog').mockResolvedValue(mockCatalog)
})

describe('OrderCatalog page', () => {
  test('shows loading state initially', async () => {
    catalogService.fetchCatalog.mockReturnValue(new Promise(() => {}))
    renderCatalog('recoger')
    expect(screen.getByText(/Cargando la carta/)).toBeInTheDocument()
  })

  test('renders catalog after loading (recoger mode)', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Nuestros Bocadillos')).toBeInTheDocument())
    expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument()
    expect(screen.getByText('Bocadillo Vegetal')).toBeInTheDocument()
  })

  test('redirects to datos when domicilio mode but no addressId', () => {
    renderCatalog('domicilio', null) // no navState → no addressId
    // Navigate redirect should occur — catalog not shown
    expect(screen.queryByText(/Cargando la carta/)).toBeNull()
  })

  test('shows catalog in domicilio mode with valid navState', async () => {
    renderCatalog('domicilio', { addressId: 'addr-1', addressLabel: 'Test Address', timing: 'asap' })
    await waitFor(() => expect(screen.getByText('Nuestros Bocadillos')).toBeInTheDocument())
  })

  test('shows error state and retry button when fetch fails', async () => {
    catalogService.fetchCatalog.mockRejectedValue(new Error('Server error'))
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText(/No se ha podido cargar la carta/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
  })

  test('retry button re-fetches catalog', async () => {
    catalogService.fetchCatalog
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce(mockCatalog)
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    await waitFor(() => expect(screen.getByText('Nuestros Bocadillos')).toBeInTheDocument())
  })

  test('shows empty catalog state when no categories', async () => {
    catalogService.fetchCatalog.mockResolvedValue([])
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText(/La carta no está disponible/)).toBeInTheDocument())
  })

  test('clicking "+" on product card adds to cart', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    const addBtn = screen.getByRole('button', { name: /Añadir Bocadillo de Jamón al pedido/ })
    fireEvent.click(addBtn)
    // After adding, cart count should show in the checkout bar
    expect(screen.getByText('Ver pedido (1)')).toBeInTheDocument()
  })

  test('clicking product card opens the product modal', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    const card = screen.getByRole('button', { name: /Ver detalle de Bocadillo de Jamón/ })
    fireEvent.click(card)
    // The modal renders after React state update — wait for it
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByText('Con jamón ibérico')).toBeInTheDocument()
  })

  test('adding from modal adds to cart and closes modal', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Ver detalle de Bocadillo de Jamón/ }))
    // Wait for modal to appear
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Añadir al pedido/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()) // modal closed
    expect(screen.getByText('Ver pedido (1)')).toBeInTheDocument()
  })

  test('checkout bar shows correct total', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Añadir Bocadillo de Jamón al pedido/ }))
    fireEvent.click(screen.getByRole('button', { name: /Añadir Bocadillo Vegetal al pedido/ }))
    // 7.5 + 6.0 = 13.5
    expect(screen.getByText('13,50 €')).toBeInTheDocument()
  })

  test('"Finalizar pedido" navigates to confirmation with cart state', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Añadir Bocadillo de Jamón al pedido/ }))
    fireEvent.click(screen.getByRole('button', { name: /Finalizar pedido/ }))
    await waitFor(() => expect(screen.getByText('Confirm page')).toBeInTheDocument())
  })
})
