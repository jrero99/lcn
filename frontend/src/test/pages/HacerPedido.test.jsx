// HacerPedido.test.jsx — tests for the order choice page.
import { screen } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HacerPedido from '../../pages/HacerPedido.jsx'

describe('HacerPedido page', () => {
  test('renders both order options', () => {
    render(<MemoryRouter><HacerPedido /></MemoryRouter>)
    expect(screen.getByText('Recogerlo en el local')).toBeInTheDocument()
    expect(screen.getByText('Recibirlo en casa')).toBeInTheDocument()
  })

  test('links to correct data entry step with mode param', () => {
    render(<MemoryRouter><HacerPedido /></MemoryRouter>)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs.some((h) => h?.includes('mode=recoger'))).toBe(true)
    expect(hrefs.some((h) => h?.includes('mode=domicilio'))).toBe(true)
  })

  test('shows discount info for recoger', () => {
    render(<MemoryRouter><HacerPedido /></MemoryRouter>)
    expect(screen.getByText('15% DESCUENTO')).toBeInTheDocument()
  })

  test('shows free shipping info for domicilio', () => {
    render(<MemoryRouter><HacerPedido /></MemoryRouter>)
    expect(screen.getByText('Envío gratis')).toBeInTheDocument()
  })
})
