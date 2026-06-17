// AddressManager.test.jsx — tests for the address management component.
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import AddressManager from '../../components/AddressManager.jsx'
import * as addressService from '../../services/addressService.js'

const mockAddress = {
  id: 'a1',
  label: 'Casa',
  street: 'Carrer de Barcelona',
  number: '12',
  floorDoor: '3r 2a',
  postalCode: '08302',
  city: 'Mataró',
  notes: 'Timbre roto',
}

const mockAddress2 = {
  id: 'a2',
  label: '',
  street: 'Passeig de Mar',
  number: '5',
  floorDoor: '',
  postalCode: '08301',
  city: 'Mataró',
  notes: '',
}

beforeEach(() => {
  vi.spyOn(addressService, 'getAddresses').mockResolvedValue({ addresses: [mockAddress] })
  vi.spyOn(addressService, 'createAddress').mockResolvedValue({ address: mockAddress2 })
  vi.spyOn(addressService, 'updateAddress').mockResolvedValue({ address: { ...mockAddress, label: 'Trabajo' } })
  vi.spyOn(addressService, 'deleteAddress').mockResolvedValue()
  vi.spyOn(addressService, 'formatAddress').mockImplementation((addr) =>
    `${addr.street}, ${addr.number}, ${addr.postalCode} ${addr.city}`
  )
})

describe('AddressManager', () => {
  test('shows loading state initially', () => {
    addressService.getAddresses.mockReturnValue(new Promise(() => {})) // never resolves
    render(<AddressManager />)
    expect(screen.getByText(/Cargando direcciones/)).toBeInTheDocument()
  })

  test('shows addresses after loading', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull())
    expect(screen.getByText('Casa')).toBeInTheDocument()
  })

  test('shows error when getAddresses fails', async () => {
    addressService.getAddresses.mockRejectedValue(new Error('Error de red'))
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText('Error de red')).toBeInTheDocument())
  })

  test('shows empty state when no addresses', async () => {
    addressService.getAddresses.mockResolvedValue({ addresses: [] })
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/No tienes ninguna dirección guardada/)).toBeInTheDocument())
  })

  test('shows heading when showHeading=true (default)', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull())
    expect(screen.getByText('Mis direcciones')).toBeInTheDocument()
  })

  test('hides heading when showHeading=false', async () => {
    render(<AddressManager showHeading={false} />)
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull())
    expect(screen.queryByText('Mis direcciones')).toBeNull()
  })

  test('shows "Añadir nueva dirección" button when fewer than 10 addresses', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
  })

  test('clicking "Añadir nueva dirección" shows the add form', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))
    expect(screen.getByLabelText(/Calle/)).toBeInTheDocument()
  })

  test('calls onFormOpenChange(true) when add form is opened', async () => {
    const onFormOpenChange = vi.fn()
    render(<AddressManager onFormOpenChange={onFormOpenChange} />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))
    expect(onFormOpenChange).toHaveBeenCalledWith(true)
  })

  test('cancelling the add form returns to list and calls onFormOpenChange(false)', async () => {
    const onFormOpenChange = vi.fn()
    render(<AddressManager onFormOpenChange={onFormOpenChange} />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onFormOpenChange).toHaveBeenLastCalledWith(false)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
  })

  test('form validation shows errors on empty submit', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))
    const form = document.querySelector('.addr-form')
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByText(/mínimo 3 caracteres/)).toBeInTheDocument())
  })

  test('form validation: invalid postal code shows error', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))

    fireEvent.change(screen.getByLabelText(/Calle/), { target: { value: 'Carrer Test' } })
    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/Código postal/), { target: { value: '1234' } })

    const form = document.querySelector('.addr-form')
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByText(/5 dígitos/)).toBeInTheDocument())
  })

  test('form validation: non-Mataró city with non-Mataró postal code shows delivery zone error', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))

    fireEvent.change(screen.getByLabelText(/Calle/), { target: { value: 'Carrer Test' } })
    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '1' } })
    // CP 08001 is Barcelona, not Mataro
    fireEvent.change(screen.getByLabelText(/Código postal/), { target: { value: '08001' } })
    fireEvent.change(screen.getByLabelText(/Ciudad/), { target: { value: 'Barcelona' } })

    // Use direct form submit for reliable triggering in jsdom
    const form = document.querySelector('.addr-form')
    fireEvent.submit(form)
    // The zone error appears in role="alert" elements
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(
        alerts.some((el) => el.textContent.includes('Solo realizamos entregas en Mataró'))
      ).toBe(true)
    })
  })

  function submitAddressForm() {
    const form = document.querySelector('.addr-form')
    fireEvent.submit(form)
  }

  test('valid form submission calls createAddress and adds to list', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))

    fireEvent.change(screen.getByLabelText(/Calle/), { target: { value: 'Passeig de Mar' } })
    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/Código postal/), { target: { value: '08301' } })
    fireEvent.change(screen.getByLabelText(/Ciudad/), { target: { value: 'Mataró' } })

    submitAddressForm()

    await waitFor(() => expect(addressService.createAddress).toHaveBeenCalled())
    // Should return to list view
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
  })

  test('onSelect is called with new address id after creation', async () => {
    const onSelect = vi.fn()
    render(<AddressManager onSelect={onSelect} />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))

    fireEvent.change(screen.getByLabelText(/Calle/), { target: { value: 'Passeig de Mar' } })
    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/Código postal/), { target: { value: '08301' } })
    fireEvent.change(screen.getByLabelText(/Ciudad/), { target: { value: 'Mataró' } })

    submitAddressForm()
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(mockAddress2.id))
  })

  test('server error on createAddress shows the error message in form', async () => {
    addressService.createAddress.mockRejectedValue(new Error('CP no permitido'))
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/Añadir nueva dirección/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Añadir nueva dirección/))

    fireEvent.change(screen.getByLabelText(/Calle/), { target: { value: 'Carrer Test' } })
    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/Código postal/), { target: { value: '08302' } })
    fireEvent.change(screen.getByLabelText(/Ciudad/), { target: { value: 'Mataró' } })

    submitAddressForm()
    await waitFor(() => expect(screen.getByText('CP no permitido')).toBeInTheDocument())
  })

  test('clicking Edit opens the edit form with pre-filled data', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Editar Casa/ }))
    const streetInput = screen.getByLabelText(/Calle/)
    expect(streetInput).toHaveValue('Carrer de Barcelona')
  })

  test('valid edit form calls updateAddress', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Editar Casa/ }))

    // Change the label
    const labelInput = screen.getByLabelText(/Nombre de la dirección/)
    fireEvent.change(labelInput, { target: { value: 'Trabajo' } })

    submitAddressForm()
    await waitFor(() => expect(addressService.updateAddress).toHaveBeenCalled())
  })

  test('clicking Eliminar opens the delete confirmation modal', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Casa/ }))
    // Modal renders behind aria-hidden backdrop — use hidden:true
    expect(screen.getByText(/Eliminar dirección/)).toBeInTheDocument()
    expect(screen.getByText(/Seguro que quieres eliminar/)).toBeInTheDocument()
  })

  test('confirming delete calls deleteAddress and removes from list', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Casa/ }))
    // The confirm "Eliminar" button is inside the modal (aria-hidden backdrop)
    const eliminarBtn = screen.getByRole('button', { name: /^Eliminar$/, hidden: true })
    fireEvent.click(eliminarBtn)
    await waitFor(() => expect(addressService.deleteAddress).toHaveBeenCalledWith('a1'))
  })

  test('deselects address when it is deleted and it was selected', async () => {
    const onSelect = vi.fn()
    render(<AddressManager selectedId="a1" onSelect={onSelect} />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Casa/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar$/, hidden: true }))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(null))
  })

  test('delete server error shows error in modal', async () => {
    addressService.deleteAddress.mockRejectedValue(new Error('No se puede eliminar'))
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Casa/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar$/, hidden: true }))
    await waitFor(() => expect(screen.getByText('No se puede eliminar')).toBeInTheDocument())
  })

  test('radio button shows when onSelect is provided', async () => {
    render(<AddressManager onSelect={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    expect(screen.getByRole('radio')).toBeInTheDocument()
  })

  test('clicking radio selects the address', async () => {
    const onSelect = vi.fn()
    render(<AddressManager onSelect={onSelect} />)
    await waitFor(() => expect(screen.getByRole('radio')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('radio'))
    expect(onSelect).toHaveBeenCalledWith('a1')
  })

  test('shows limit message when 10 addresses are present', async () => {
    const tenAddresses = Array.from({ length: 10 }, (_, i) => ({
      ...mockAddress, id: `a${i}`,
    }))
    addressService.getAddresses.mockResolvedValue({ addresses: tenAddresses })
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText(/límite de 10 direcciones/)).toBeInTheDocument())
  })

  test('clicking address item content calls onSelect and onSelectAddress when both provided', async () => {
    const onSelect = vi.fn()
    const onSelectAddress = vi.fn()
    render(<AddressManager onSelect={onSelect} onSelectAddress={onSelectAddress} />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    // Click on the address item content (the div that wraps label + text)
    const addrContent = document.querySelector('.addr-item-content')
    fireEvent.click(addrContent)
    expect(onSelect).toHaveBeenCalledWith('a1')
    expect(onSelectAddress).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }))
  })

  test('closing delete modal while not deleting resets modal state', async () => {
    render(<AddressManager />)
    await waitFor(() => expect(screen.getByText('Casa')).toBeInTheDocument())
    // Open delete modal
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Casa/ }))
    expect(screen.getByText(/Eliminar dirección/)).toBeInTheDocument()
    // Click cancel button inside the modal to close it (not the X / backdrop)
    const cancelBtn = screen.getByRole('button', { name: /Cancelar/, hidden: true })
    fireEvent.click(cancelBtn)
    // Modal should close
    await waitFor(() => expect(screen.queryByText(/Seguro que quieres eliminar/)).toBeNull())
  })
})
