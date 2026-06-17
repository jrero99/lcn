// ProductCard.test.jsx — tests for the product card component.
import { render, screen, fireEvent } from '@testing-library/react'
import ProductCard from '../../components/ProductCard.jsx'

const product = {
  id: 'p1',
  name: 'Bocadillo de jamón',
  description: 'Con jamón ibérico y tomate natural',
  price: 7.5,
  allergens: ['gluten', 'lacteos'],
}

describe('ProductCard', () => {
  test('renders product name, description and price', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} onOpen={vi.fn()} />)
    expect(screen.getByText('Bocadillo de jamón')).toBeInTheDocument()
    expect(screen.getByText(/jamón ibérico/)).toBeInTheDocument()
    expect(screen.getByText('7,50 €')).toBeInTheDocument()
  })

  test('renders formatted allergens', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} onOpen={vi.fn()} />)
    expect(screen.getByText(/Gluten, Lácteos/)).toBeInTheDocument()
  })

  test('does not render allergens section when allergens array is empty', () => {
    const noAllergens = { ...product, allergens: [] }
    render(<ProductCard product={noAllergens} onAdd={vi.fn()} onOpen={vi.fn()} />)
    expect(screen.queryByText(/Alérgenos/)).toBeNull()
  })

  test('clicking the card calls onOpen with the product', () => {
    const onOpen = vi.fn()
    render(<ProductCard product={product} onAdd={vi.fn()} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /Ver detalle de Bocadillo de jamón/i }))
    expect(onOpen).toHaveBeenCalledWith(product)
  })

  test('"+" button calls onAdd without opening the modal', () => {
    const onAdd = vi.fn()
    const onOpen = vi.fn()
    render(<ProductCard product={product} onAdd={onAdd} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /Añadir Bocadillo de jamón al pedido/i }))
    expect(onAdd).toHaveBeenCalledWith(product)
    expect(onOpen).not.toHaveBeenCalled()
  })

  test('pressing Enter on card calls onOpen', () => {
    const onOpen = vi.fn()
    render(<ProductCard product={product} onAdd={vi.fn()} onOpen={onOpen} />)
    const card = screen.getByRole('button', { name: /Ver detalle de/i })
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledWith(product)
  })

  test('pressing Space on card calls onOpen', () => {
    const onOpen = vi.fn()
    render(<ProductCard product={product} onAdd={vi.fn()} onOpen={onOpen} />)
    const card = screen.getByRole('button', { name: /Ver detalle de/i })
    fireEvent.keyDown(card, { key: ' ' })
    expect(onOpen).toHaveBeenCalledWith(product)
  })
})
