// Modal.test.jsx — tests for the generic Modal component.
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../../components/Modal.jsx'

describe('Modal', () => {
  test('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders title and default message when isOpen is true', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} />)
    // aria-hidden on backdrop means we query with hidden:true
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument()
    expect(screen.getByText('¡GRACIAS POR TU PEDIDO!')).toBeInTheDocument()
    expect(screen.getByText(/Hemos recibido tu pedido/)).toBeInTheDocument()
  })

  test('renders custom title and message', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Titulo personalizado" message="Mensaje personalizado" />
    )
    expect(screen.getByText('Titulo personalizado')).toBeInTheDocument()
    expect(screen.getByText('Mensaje personalizado')).toBeInTheDocument()
  })

  test('does not render message paragraph when message is null', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="Solo título" message={null} />)
    expect(screen.getByText('Solo título')).toBeInTheDocument()
    expect(screen.queryByText(/Hemos recibido/)).toBeNull()
  })

  test('renders children inside the dialog', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <button>Custom button</button>
      </Modal>
    )
    // aria-hidden on backdrop: use hidden:true for children inside
    expect(screen.getByRole('button', { name: 'Custom button', hidden: true })).toBeInTheDocument()
  })

  test('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<Modal isOpen={true} onClose={onClose} />)
    // aria-hidden on backdrop; query with hidden:true
    fireEvent.click(screen.getByRole('button', { name: /Cerrar/i, hidden: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<Modal isOpen={true} onClose={onClose} />)
    const backdrop = document.querySelector('.modal-backdrop')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('does not call onClose when clicking inside the dialog panel', () => {
    const onClose = vi.fn()
    render(<Modal isOpen={true} onClose={onClose} />)
    const panel = screen.getByRole('dialog', { hidden: true })
    fireEvent.click(panel)
    expect(onClose).not.toHaveBeenCalled()
  })

  test('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<Modal isOpen={true} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('locks body scroll when open', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} />)
    expect(document.body.style.overflow).toBe('hidden')
  })

  test('restores body scroll when closed via prop change', () => {
    document.body.style.overflow = ''
    const { rerender } = render(<Modal isOpen={true} onClose={vi.fn()} />)
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<Modal isOpen={false} onClose={vi.fn()} />)
    expect(document.body.style.overflow).toBe('')
  })

  test('focuses the close button when opened', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} />)
    const closeBtn = screen.getByRole('button', { name: /Cerrar/i, hidden: true })
    expect(document.activeElement).toBe(closeBtn)
  })

  test('has correct ARIA attributes on dialog', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="Test" />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
  })
})
