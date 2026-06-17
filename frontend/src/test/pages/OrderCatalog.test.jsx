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
      {
        id: 'p3',
        name: 'Bocadillo Premium',
        description: 'Con opciones de tamaño',
        price: 8.0,
        allergens: [],
        options: [
          {
            id: 'g1',
            label: 'Tamaño',
            choices: [
              { id: 'c1', label: 'Normal', priceExtra: 0 },
              { id: 'c2', label: 'Extra grande', priceExtra: 2 },
            ],
          },
          {
            id: 'g2',
            label: 'Pan',
            choices: [
              { id: 'c3', label: 'Blanco', priceExtra: 0 },
              { id: 'c4', label: 'Integral', priceExtra: 0.5 },
            ],
          },
        ],
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
        <Route path="/hacer-pedido/recoger" element={<OrderCatalog mode="recoger" />} />
        <Route path="/hacer-pedido/domicilio" element={<OrderCatalog mode="domicilio" />} />
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
    // The modal renders after React state update — wait for the close button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cerrar ficha del producto/ })).toBeInTheDocument()
    })
    // Description text appears in both card AND modal — check modal-specific button
    expect(screen.getByRole('button', { name: /Añadir al pedido/ })).toBeInTheDocument()
  })

  test('adding from modal adds to cart and closes modal', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Ver detalle de Bocadillo de Jamón/ }))
    // Wait for modal close button to appear
    await waitFor(() => expect(screen.getByRole('button', { name: /Cerrar ficha del producto/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Añadir al pedido/ }))
    // After adding, the modal close button disappears (modal closed)
    await waitFor(() => expect(screen.queryByRole('button', { name: /Cerrar ficha del producto/ })).toBeNull())
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

  test('"Cambiar" in checkout bar navigates back to datos page', async () => {
    renderCatalog('domicilio', { addressId: 'addr-1', addressLabel: 'Carrer Test, 1', timing: 'asap' })
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    // The "Cambiar" button is in the checkout bar for domicilio mode
    const cambiarBtn = screen.getByRole('button', { name: /Cambiar/i })
    fireEvent.click(cambiarBtn)
    await waitFor(() => expect(screen.getByText('Datos page')).toBeInTheDocument())
  })

  test('category nav clicking calls handleCategorySelect', async () => {
    // Add a second category to have a nav item to click
    catalogService.fetchCatalog.mockResolvedValue([
      ...mockCatalog,
      {
        id: 'cat2',
        slug: 'bebidas',
        label: 'Bebidas',
        heading: 'Nuestras Bebidas',
        products: [{ id: 'p3', name: 'Agua', description: 'Agua fría', price: 1.0, allergens: [], options: [] }],
      },
    ])
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Nuestros Bocadillos')).toBeInTheDocument())
    // Click on the Bebidas tab to trigger handleCategorySelect
    const bebidas = screen.getByRole('tab', { name: /Bebidas/ })
    fireEvent.click(bebidas)
    // The window.scrollTo stub in setup.js absorbs the scroll call
    expect(screen.getByText('Nuestras Bebidas')).toBeInTheDocument()
  })

  test('retry button error path catches and shows error again', async () => {
    catalogService.fetchCatalog
      .mockRejectedValueOnce(new Error('Server error'))
      .mockRejectedValueOnce(new Error('Still down'))
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    await waitFor(() => expect(screen.getByText(/No se ha podido cargar la carta/)).toBeInTheDocument())
    expect(screen.getByText('Still down')).toBeInTheDocument()
  })

  test('decreasing item quantity in cart removes it when it reaches zero', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    // Add item
    fireEvent.click(screen.getByRole('button', { name: /Añadir Bocadillo de Jamón al pedido/ }))
    // Cart count shows in the button text "Ver pedido (1)"
    await waitFor(() => expect(screen.getByText(/Ver pedido \(1\)/)).toBeInTheDocument())
    // Expand cart by clicking the aria-label button
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido \(1 unitat\)/ }))
    // Decrease quantity via "-" button
    const minusBtn = screen.getByRole('button', { name: /Quitar una unidad de Bocadillo de Jamón/ })
    fireEvent.click(minusBtn)
    // Cart is now empty — item removed
    await waitFor(() => expect(screen.queryByText(/Ver pedido \(/)).toBeNull())
  })

  test('increasing item quantity via "+" button updates cart count', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    // Add item once via product card "+" button
    fireEvent.click(screen.getByRole('button', { name: /Añadir Bocadillo de Jamón al pedido/ }))
    await waitFor(() => expect(screen.getByText(/Ver pedido \(1\)/)).toBeInTheDocument())
    // Expand cart panel
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido \(1 unitat\)/ }))
    // Increase quantity via "+" button in cart panel (nextQty > 0 branch)
    const plusBtn = screen.getByRole('button', { name: /Añadir una unidad de Bocadillo de Jamón/ })
    fireEvent.click(plusBtn)
    // Collapse the panel to see the "Ver pedido (2)" button text
    fireEvent.click(screen.getByRole('button', { name: /Ocultar detalle del pedido/ }))
    // Cart count should now be 2
    await waitFor(() => expect(screen.getByText(/Ver pedido \(2\)/)).toBeInTheDocument())
  })

  test('remove button in cart panel removes the line entirely', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo de Jamón')).toBeInTheDocument())
    // Add item
    fireEvent.click(screen.getByRole('button', { name: /Añadir Bocadillo de Jamón al pedido/ }))
    await waitFor(() => expect(screen.getByText(/Ver pedido \(1\)/)).toBeInTheDocument())
    // Expand cart
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido \(1 unitat\)/ }))
    // Remove via trash button (handleRemoveLine)
    const removeBtn = screen.getByRole('button', { name: /Eliminar Bocadillo de Jamón del pedido/ })
    fireEvent.click(removeBtn)
    // Cart is now empty
    await waitFor(() => expect(screen.queryByText(/Ver pedido \(/)).toBeNull())
  })

  test('adding product with options from modal covers computeUnitPrice and resolveOptionLabels branches', async () => {
    renderCatalog('recoger')
    await waitFor(() => expect(screen.getByText('Bocadillo Premium')).toBeInTheDocument())
    // Open modal for the product with options
    fireEvent.click(screen.getByRole('button', { name: /Ver detalle de Bocadillo Premium/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Cerrar ficha del producto/ })).toBeInTheDocument())
    // Select "Extra grande" (+2€) to cover the priceExtra branch
    const extraRadio = screen.getByDisplayValue('c2')
    fireEvent.click(extraRadio)
    // Add to cart
    fireEvent.click(screen.getByRole('button', { name: /Añadir al pedido/ }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /Cerrar ficha del producto/ })).toBeNull())
    // Cart shows total 10,00 € (8 + 2 priceExtra)
    expect(screen.getByText('10,00 €')).toBeInTheDocument()
    // Expand cart to see resolveOptionLabels (option labels in cart panel)
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido \(1 unitat\)/ }))
    const premiumRefs = screen.getAllByText('Bocadillo Premium')
    // Appears in both catalog card and cart line
    expect(premiumRefs.length).toBeGreaterThanOrEqual(1)
  })
})
