// ProductModal.test.jsx — tests for the product detail modal.
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProductModal from '../../components/ProductModal.jsx'

const simpleProduct = {
  id: 'p1',
  name: 'Bocadillo Mixto',
  description: 'Jamón y queso con pan tostado',
  price: 6.5,
  allergens: ['gluten', 'lacteos'],
}

const productWithOptions = {
  id: 'p2',
  name: 'Bocadillo personalizable',
  description: 'A tu gusto',
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
  ],
}

const productWithIngredients = {
  id: 'p3',
  name: 'Bocadillo Vegetal',
  description: 'Lleno de verduras',
  price: 5.0,
  allergens: [],
  ingredients: ['lechuga', 'tomate', 'cebolla'],
}

function renderModal(props) {
  return render(
    <MemoryRouter>
      <ProductModal {...props} />
    </MemoryRouter>
  )
}

describe('ProductModal', () => {
  test('renders product name, description and price', () => {
    renderModal({ product: simpleProduct, onClose: vi.fn(), onAdd: vi.fn() })
    expect(screen.getByText('Bocadillo Mixto')).toBeInTheDocument()
    expect(screen.getByText(/Jamón y queso/)).toBeInTheDocument()
    expect(screen.getByText('6,50 €')).toBeInTheDocument()
  })

  test('renders allergens when present', () => {
    renderModal({ product: simpleProduct, onClose: vi.fn(), onAdd: vi.fn() })
    expect(screen.getByText(/Gluten, Lácteos/)).toBeInTheDocument()
  })

  test('closes when close button is clicked', () => {
    const onClose = vi.fn()
    renderModal({ product: simpleProduct, onClose, onAdd: vi.fn() })
    fireEvent.click(screen.getByRole('button', { name: /Cerrar ficha del producto/i }))
    expect(onClose).toHaveBeenCalled()
  })

  test('closes when backdrop is clicked', () => {
    const onClose = vi.fn()
    renderModal({ product: simpleProduct, onClose, onAdd: vi.fn() })
    const backdrop = document.querySelector('.product-modal-backdrop')
    // Click the backdrop directly (not the inner dialog)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  test('does not close when clicking inside the dialog', () => {
    const onClose = vi.fn()
    renderModal({ product: simpleProduct, onClose, onAdd: vi.fn() })
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
  })

  test('closes on Escape key', () => {
    const onClose = vi.fn()
    renderModal({ product: simpleProduct, onClose, onAdd: vi.fn() })
    // ProductModal traps keydown on the backdrop div via onKeyDown prop
    const backdrop = document.querySelector('.product-modal-backdrop')
    fireEvent.keyDown(backdrop, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  test('"Añadir al pedido" button calls onAdd and onClose', () => {
    const onAdd = vi.fn()
    const onClose = vi.fn()
    renderModal({ product: simpleProduct, onClose, onAdd })
    fireEvent.click(screen.getByRole('button', { name: /Añadir al pedido/i }))
    expect(onAdd).toHaveBeenCalledWith(simpleProduct, expect.objectContaining({
      selectedOptions: {},
      removedIngredients: [],
      notes: '',
    }))
    expect(onClose).toHaveBeenCalled()
  })

  test('renders option groups and selects first choice by default', () => {
    renderModal({ product: productWithOptions, onClose: vi.fn(), onAdd: vi.fn() })
    expect(screen.getByText('Tamaño')).toBeInTheDocument()
    const normalRadio = screen.getByDisplayValue('c1')
    expect(normalRadio).toBeChecked()
  })

  test('changing option choice updates selection', () => {
    const onAdd = vi.fn()
    renderModal({ product: productWithOptions, onClose: vi.fn(), onAdd })
    const extraRadio = screen.getByDisplayValue('c2')
    fireEvent.click(extraRadio)
    expect(extraRadio).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /Añadir al pedido/i }))
    expect(onAdd).toHaveBeenCalledWith(
      productWithOptions,
      expect.objectContaining({ selectedOptions: { g1: 'c2' } })
    )
  })

  test('renders ingredient checkboxes checked by default', () => {
    renderModal({ product: productWithIngredients, onClose: vi.fn(), onAdd: vi.fn() })
    expect(screen.getByText('lechuga')).toBeInTheDocument()
    // All ingredients are kept (checked) by default
    const lechugas = screen.getAllByRole('checkbox')
    lechugas.forEach((cb) => expect(cb).toBeChecked())
  })

  test('unchecking an ingredient adds it to removedIngredients', () => {
    const onAdd = vi.fn()
    renderModal({ product: productWithIngredients, onClose: vi.fn(), onAdd })
    const tomate = screen.getByDisplayValue
      ? screen.queryByLabelText?.('tomate')
      : null
    // Find the tomate checkbox — it's labeled by the ingredient name text
    const checkboxes = screen.getAllByRole('checkbox')
    // lechuga=0, tomate=1, cebolla=2
    fireEvent.click(checkboxes[1]) // uncheck tomate
    fireEvent.click(screen.getByRole('button', { name: /Añadir al pedido/i }))
    expect(onAdd).toHaveBeenCalledWith(
      productWithIngredients,
      expect.objectContaining({ removedIngredients: ['tomate'] })
    )
  })

  test('notes textarea updates notes in onAdd callback', () => {
    const onAdd = vi.fn()
    renderModal({ product: simpleProduct, onClose: vi.fn(), onAdd })
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Sin sal, por favor' } })
    fireEvent.click(screen.getByRole('button', { name: /Añadir al pedido/i }))
    expect(onAdd).toHaveBeenCalledWith(
      simpleProduct,
      expect.objectContaining({ notes: 'Sin sal, por favor' })
    )
  })

  test('readOnly mode shows login CTA instead of add button', () => {
    renderModal({ product: simpleProduct, onClose: vi.fn(), onAdd: vi.fn(), readOnly: true })
    expect(screen.getByRole('link', { name: /Inicia sesión para pedir/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Añadir al pedido/i })).toBeNull()
  })

  test('has correct ARIA attributes', () => {
    renderModal({ product: simpleProduct, onClose: vi.fn(), onAdd: vi.fn() })
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', `modal-title-${simpleProduct.id}`)
  })
})
