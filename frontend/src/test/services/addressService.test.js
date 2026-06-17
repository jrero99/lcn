// addressService.test.js — unit tests for the address service layer.
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  formatAddress,
} from '../../services/addressService.js'
import * as sessionEvents from '../../services/sessionEvents.js'

function makeResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: `Status ${status}`,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  global.fetch = vi.fn()
  vi.spyOn(sessionEvents, 'notifyUnauthorized').mockImplementation(() => {})
})

// ── formatAddress ─────────────────────────────────────────────────────────────

describe('formatAddress', () => {
  test('formats a minimal address (no floorDoor)', () => {
    const addr = { street: 'Carrer de Barcelona', number: '12', postalCode: '08302', city: 'Mataró' }
    expect(formatAddress(addr)).toBe('Carrer de Barcelona, 12, 08302 Mataró')
  })

  test('includes floorDoor when present', () => {
    const addr = { street: 'Passeig de Gràcia', number: '1', floorDoor: '3r 2a', postalCode: '08003', city: 'Mataró' }
    expect(formatAddress(addr)).toBe('Passeig de Gràcia, 1, 3r 2a, 08003 Mataró')
  })

  test('omits floorDoor when empty string', () => {
    const addr = { street: 'Rambla', number: '5', floorDoor: '', postalCode: '08301', city: 'Mataró' }
    expect(formatAddress(addr)).toBe('Rambla, 5, 08301 Mataró')
  })
})

// ── getAddresses ──────────────────────────────────────────────────────────────

describe('getAddresses', () => {
  test('resolves with addresses on 200', async () => {
    const addresses = [{ id: 'a1', street: 'C/Test', number: '1', postalCode: '08301', city: 'Mataró' }]
    global.fetch.mockReturnValue(makeResponse(200, { addresses }))
    const result = await getAddresses()
    expect(result).toEqual({ addresses })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/addresses'),
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    )
  })

  test('calls notifyUnauthorized and throws on 401', async () => {
    global.fetch.mockReturnValue(makeResponse(401, {}))
    await expect(getAddresses()).rejects.toThrow('Necesitas iniciar sesión')
    expect(sessionEvents.notifyUnauthorized).toHaveBeenCalled()
  })

  test('throws with status on other errors', async () => {
    global.fetch.mockReturnValue(makeResponse(500, {}))
    await expect(getAddresses()).rejects.toThrow('No se han podido cargar las direcciones (500).')
  })
})

// ── createAddress ─────────────────────────────────────────────────────────────

describe('createAddress', () => {
  const payload = { street: 'Test', number: '1', postalCode: '08302', city: 'Mataró' }

  test('resolves on 201', async () => {
    const address = { id: 'a2', ...payload }
    global.fetch.mockReturnValue(makeResponse(201, { address }))
    const result = await createAddress(payload)
    expect(result).toEqual({ address })
  })

  test('calls notifyUnauthorized and throws on 401', async () => {
    global.fetch.mockReturnValue(makeResponse(401, {}))
    await expect(createAddress(payload)).rejects.toThrow('Necesitas iniciar sesión')
    expect(sessionEvents.notifyUnauthorized).toHaveBeenCalled()
  })

  test('throws zone message on 422', async () => {
    global.fetch.mockReturnValue(makeResponse(422, {}))
    await expect(createAddress(payload)).rejects.toThrow('Revisa los datos de la dirección')
  })

  test('uses server message from issues array on 422', async () => {
    global.fetch.mockReturnValue(makeResponse(422, { issues: [{ message: 'CP no válido' }] }))
    await expect(createAddress(payload)).rejects.toThrow('CP no válido')
  })

  test('throws rate-limit message on 429', async () => {
    global.fetch.mockReturnValue(makeResponse(429, {}))
    await expect(createAddress(payload)).rejects.toThrow('Demasiados intentos')
  })

  test('throws default message on unknown error', async () => {
    global.fetch.mockReturnValue(makeResponse(500, {}))
    await expect(createAddress(payload)).rejects.toThrow('No se ha podido guardar la dirección (500).')
  })

  test('uses server error message on unknown error', async () => {
    global.fetch.mockReturnValue(makeResponse(500, { error: 'DB error' }))
    await expect(createAddress(payload)).rejects.toThrow('DB error')
  })
})

// ── updateAddress ─────────────────────────────────────────────────────────────

describe('updateAddress', () => {
  test('resolves on 200', async () => {
    const address = { id: 'a1', street: 'Updated', number: '99', postalCode: '08301', city: 'Mataró' }
    global.fetch.mockReturnValue(makeResponse(200, { address }))
    const result = await updateAddress('a1', { street: 'Updated', number: '99' })
    expect(result).toEqual({ address })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/addresses/a1'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  test('calls notifyUnauthorized and throws on 401', async () => {
    global.fetch.mockReturnValue(makeResponse(401, {}))
    await expect(updateAddress('a1', {})).rejects.toThrow('Necesitas iniciar sesión')
    expect(sessionEvents.notifyUnauthorized).toHaveBeenCalled()
  })

  test('throws on 404', async () => {
    global.fetch.mockReturnValue(makeResponse(404, {}))
    await expect(updateAddress('a1', {})).rejects.toThrow('Dirección no encontrada.')
  })

  test('throws on 422', async () => {
    global.fetch.mockReturnValue(makeResponse(422, {}))
    await expect(updateAddress('a1', {})).rejects.toThrow('Revisa los datos de la dirección.')
  })

  test('throws on 429', async () => {
    global.fetch.mockReturnValue(makeResponse(429, {}))
    await expect(updateAddress('a1', {})).rejects.toThrow('Demasiados intentos')
  })

  test('throws with issues array message on 422', async () => {
    global.fetch.mockReturnValue(makeResponse(422, { issues: [{ message: 'Campo requerido' }] }))
    await expect(updateAddress('a1', {})).rejects.toThrow('Campo requerido')
  })

  test('throws default message on unknown error', async () => {
    global.fetch.mockReturnValue(makeResponse(503, {}))
    await expect(updateAddress('a1', {})).rejects.toThrow('No se ha podido actualizar la dirección (503).')
  })
})

// ── deleteAddress ─────────────────────────────────────────────────────────────

describe('deleteAddress', () => {
  test('resolves on 204 (no body)', async () => {
    global.fetch.mockReturnValue(Promise.resolve({ status: 204, ok: true }))
    await expect(deleteAddress('a1')).resolves.toBeUndefined()
  })

  test('calls notifyUnauthorized and throws on 401', async () => {
    global.fetch.mockReturnValue(makeResponse(401, {}))
    await expect(deleteAddress('a1')).rejects.toThrow('Necesitas iniciar sesión')
    expect(sessionEvents.notifyUnauthorized).toHaveBeenCalled()
  })

  test('throws on 404', async () => {
    global.fetch.mockReturnValue(makeResponse(404, {}))
    await expect(deleteAddress('a1')).rejects.toThrow('Dirección no encontrada.')
  })

  test('throws on 429', async () => {
    global.fetch.mockReturnValue(makeResponse(429, {}))
    await expect(deleteAddress('a1')).rejects.toThrow('Demasiados intentos')
  })

  test('throws default message on unknown error', async () => {
    global.fetch.mockReturnValue(makeResponse(500, {}))
    await expect(deleteAddress('a1')).rejects.toThrow('No se ha podido eliminar la dirección (500).')
  })

  test('uses server error field on unknown error', async () => {
    global.fetch.mockReturnValue(makeResponse(500, { error: 'DB failure' }))
    await expect(deleteAddress('a1')).rejects.toThrow('DB failure')
  })
})
