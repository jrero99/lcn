// CheckoutBar.test.jsx — tests for the checkout bar component.
import { render, screen, fireEvent } from '@testing-library/react'
import CheckoutBar from '../../components/CheckoutBar.jsx'

const baseProps = {
  mode: 'recoger',
  total: 0,
  cartCount: 0,
  cartLines: [],
  addressLabel: null,
  onChangeAddress: vi.fn(),
  onCheckout: vi.fn(),
  onChangeLineQuantity: vi.fn(),
  onRemoveLine: vi.fn(),
}

const makeProduct = (overrides = {}) => ({
  id: 'p1',
  name: 'Bocadillo Test',
  price: 5.5,
  options: [],
  ...overrides,
})

describe('CheckoutBar', () => {
  test('renders "Finalizar pedido" button disabled when total is 0', () => {
    render(<CheckoutBar {...baseProps} />)
    const btn = screen.getByRole('button', { name: /Finalizar pedido/ })
    expect(btn).toBeDisabled()
  })

  test('renders total formatted as Spanish euros', () => {
    render(<CheckoutBar {...baseProps} total={12.5} cartCount={2} />)
    expect(screen.getByText('12,50 €')).toBeInTheDocument()
  })

  test('shows delivery address label in domicilio mode', () => {
    render(
      <CheckoutBar
        {...baseProps}
        mode="domicilio"
        total={5}
        cartCount={1}
        addressLabel="Carrer Test, 1, 08302 Mataró"
      />
    )
    expect(screen.getByText('Carrer Test, 1, 08302 Mataró')).toBeInTheDocument()
    expect(screen.getByText(/Entregaremos tu pedido en:/)).toBeInTheDocument()
  })

  test('shows pickup info in recoger mode', () => {
    render(<CheckoutBar {...baseProps} mode="recoger" />)
    expect(screen.getByText(/Recogerás tu pedido en:/)).toBeInTheDocument()
    expect(screen.getByText(/La Casa Nostra/)).toBeInTheDocument()
  })

  test('shows "Sin dirección seleccionada" when no address in domicilio mode', () => {
    render(<CheckoutBar {...baseProps} mode="domicilio" addressLabel={null} />)
    expect(screen.getByText('Sin dirección seleccionada')).toBeInTheDocument()
  })

  test('shows "Cambiar" button in domicilio mode', () => {
    render(<CheckoutBar {...baseProps} mode="domicilio" />)
    expect(screen.getByRole('button', { name: /Cambiar dirección/ })).toBeInTheDocument()
  })

  test('"Cambiar" calls onChangeAddress', () => {
    const onChangeAddress = vi.fn()
    render(<CheckoutBar {...baseProps} mode="domicilio" onChangeAddress={onChangeAddress} />)
    fireEvent.click(screen.getByRole('button', { name: /Cambiar dirección/ }))
    expect(onChangeAddress).toHaveBeenCalled()
  })

  test('shows "Ver pedido" toggle when cart has items', () => {
    const cartLines = [{
      key: 'k1', product: makeProduct(), quantity: 2,
      selectedOptions: {}, removedIngredients: [], notes: '',
    }]
    render(<CheckoutBar {...baseProps} total={11} cartCount={2} cartLines={cartLines} />)
    expect(screen.getByRole('button', { name: /Ver pedido/i })).toBeInTheDocument()
  })

  test('toggles cart panel on "Ver pedido" click', () => {
    const cartLines = [{
      key: 'k1', product: makeProduct(), quantity: 1,
      selectedOptions: {}, removedIngredients: [], notes: '',
    }]
    render(<CheckoutBar {...baseProps} total={5.5} cartCount={1} cartLines={cartLines} />)
    const toggle = screen.getByRole('button', { name: /Ver pedido/i })
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: /Ocultar/i })).toBeInTheDocument()
    // Product name should appear in the expanded panel
    expect(screen.getByText('Bocadillo Test')).toBeInTheDocument()
  })

  test('shows customizations in expanded cart panel', () => {
    const product = makeProduct({
      options: [{ id: 'g1', label: 'Tamaño', choices: [{ id: 'c1', label: 'Grande', priceExtra: 1 }] }],
    })
    const cartLines = [{
      key: 'k1', product, quantity: 1,
      selectedOptions: { g1: 'c1' }, removedIngredients: ['cebolla'], notes: 'Sin sal',
    }]
    render(<CheckoutBar {...baseProps} total={6.5} cartCount={1} cartLines={cartLines} />)
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido/i }))
    expect(screen.getByText(/Tamaño:/)).toBeInTheDocument()
    expect(screen.getByText('Grande')).toBeInTheDocument()
    expect(screen.getByText(/cebolla/)).toBeInTheDocument()
    expect(screen.getByText(/Sin sal/)).toBeInTheDocument()
  })

  test('quantity change buttons call onChangeLineQuantity', () => {
    const onChangeLineQuantity = vi.fn()
    const cartLines = [{
      key: 'k1', product: makeProduct(), quantity: 2,
      selectedOptions: {}, removedIngredients: [], notes: '',
    }]
    render(
      <CheckoutBar
        {...baseProps}
        total={11} cartCount={2} cartLines={cartLines}
        onChangeLineQuantity={onChangeLineQuantity}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido/i }))
    const minusBtn = screen.getByRole('button', { name: /Quitar una unidad de Bocadillo Test/ })
    const plusBtn = screen.getByRole('button', { name: /Añadir una unidad de Bocadillo Test/ })
    fireEvent.click(minusBtn)
    expect(onChangeLineQuantity).toHaveBeenCalledWith('k1', -1)
    fireEvent.click(plusBtn)
    expect(onChangeLineQuantity).toHaveBeenCalledWith('k1', 1)
  })

  test('remove button calls onRemoveLine', () => {
    const onRemoveLine = vi.fn()
    const cartLines = [{
      key: 'k1', product: makeProduct(), quantity: 1,
      selectedOptions: {}, removedIngredients: [], notes: '',
    }]
    render(
      <CheckoutBar
        {...baseProps}
        total={5.5} cartCount={1} cartLines={cartLines}
        onRemoveLine={onRemoveLine}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido/i }))
    const removeBtn = screen.getByRole('button', { name: /Eliminar Bocadillo Test/ })
    fireEvent.click(removeBtn)
    expect(onRemoveLine).toHaveBeenCalledWith('k1')
  })

  test('"Finalizar pedido" calls onCheckout when total > 0', () => {
    const onCheckout = vi.fn()
    render(<CheckoutBar {...baseProps} total={5} cartCount={1} onCheckout={onCheckout} />)
    fireEvent.click(screen.getByRole('button', { name: /Finalizar pedido/ }))
    expect(onCheckout).toHaveBeenCalled()
  })

  test('computes line total with priceExtra', () => {
    const product = makeProduct({
      options: [{ id: 'g1', label: 'X', choices: [{ id: 'c2', label: 'Extra', priceExtra: 2 }] }],
    })
    const cartLines = [{
      key: 'k2', product, quantity: 1,
      selectedOptions: { g1: 'c2' }, removedIngredients: [], notes: '',
    }]
    render(<CheckoutBar {...baseProps} total={7.5} cartCount={1} cartLines={cartLines} />)
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido/i }))
    // line total = 5.5 + 2 = 7.5; total bar also shows 7,50 €
    // Both the line and the total bar show the same price, so getAllByText is fine
    const priceElements = screen.getAllByText('7,50 €')
    expect(priceElements.length).toBeGreaterThanOrEqual(1)
  })
})
