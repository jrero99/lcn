// orderService.test.js — unit tests for the order service.
import { createOrder } from '../../services/orderService.js'
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

const basePayload = {
  idempotencyKey: 'key-abc',
  mode: 'recoger',
  paymentMethod: 'CASH',
  timing: 'asap',
  contactPhone: '+34612345678',
  items: [{ productId: 'p1', quantity: 2 }],
}

describe('createOrder', () => {
  test('maps recoger → PICKUP and asap → ASAP in the request body', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o1' }))
    await createOrder(basePayload)

    const call = global.fetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.mode).toBe('PICKUP')
    expect(body.timing).toBe('ASAP')
    expect(body.addressId).toBeUndefined() // PICKUP → no addressId
  })

  test('maps domicilio → DELIVERY and includes addressId', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o2' }))
    await createOrder({ ...basePayload, mode: 'domicilio', addressId: 'addr-1' })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.mode).toBe('DELIVERY')
    expect(body.addressId).toBe('addr-1')
  })

  test('maps programar → SCHEDULED and includes scheduledFor', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o3' }))
    await createOrder({ ...basePayload, timing: 'programar', scheduledFor: '2026-06-20T20:00:00Z' })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.timing).toBe('SCHEDULED')
    expect(body.scheduledFor).toBe('2026-06-20T20:00:00Z')
  })

  test('omits scheduledFor when timing is asap', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o4' }))
    await createOrder({ ...basePayload, timing: 'asap', scheduledFor: '2026-06-20T20:00:00Z' })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.scheduledFor).toBeUndefined()
  })

  test('includes selectedOptions only when non-empty', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o5' }))
    await createOrder({
      ...basePayload,
      items: [{ productId: 'p1', quantity: 1, selectedOptions: { g1: 'c1' } }],
    })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.items[0].selectedOptions).toEqual({ g1: 'c1' })
  })

  test('omits selectedOptions when empty', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o6' }))
    await createOrder({
      ...basePayload,
      items: [{ productId: 'p1', quantity: 1, selectedOptions: {} }],
    })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.items[0].selectedOptions).toBeUndefined()
  })

  test('includes removedIngredients only when non-empty', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o7' }))
    await createOrder({
      ...basePayload,
      items: [{ productId: 'p1', quantity: 1, removedIngredients: ['cebolla'] }],
    })
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.items[0].removedIngredients).toEqual(['cebolla'])
  })

  test('includes notes on item level', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o8' }))
    await createOrder({
      ...basePayload,
      items: [{ productId: 'p1', quantity: 1, notes: 'Sin sal' }],
    })
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.items[0].notes).toBe('Sin sal')
  })

  test('includes order-level notes when provided', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o9' }))
    await createOrder({ ...basePayload, notes: 'Llamar al portal' })
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.notes).toBe('Llamar al portal')
  })

  test('resolves with orderId on 201', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { orderId: 'o10' }))
    const result = await createOrder(basePayload)
    expect(result.orderId).toBe('o10')
  })

  test('calls notifyUnauthorized and throws on 401', async () => {
    global.fetch.mockReturnValue(makeResponse(401, {}))
    await expect(createOrder(basePayload)).rejects.toThrow('sesión ha expirado')
    expect(sessionEvents.notifyUnauthorized).toHaveBeenCalled()
  })

  test('throws on 403', async () => {
    global.fetch.mockReturnValue(makeResponse(403, {}))
    await expect(createOrder(basePayload)).rejects.toThrow('No hemos podido procesar el pedido')
  })

  test('throws on 422 with server message', async () => {
    global.fetch.mockReturnValue(makeResponse(422, { issues: [{ message: 'Producto no disponible' }] }))
    await expect(createOrder(basePayload)).rejects.toThrow('Producto no disponible')
  })

  test('throws on 429', async () => {
    global.fetch.mockReturnValue(makeResponse(429, {}))
    await expect(createOrder(basePayload)).rejects.toThrow('Demasiados intentos')
  })

  test('throws default message on unknown error', async () => {
    global.fetch.mockReturnValue(makeResponse(503, {}))
    await expect(createOrder(basePayload)).rejects.toThrow('No se ha podido enviar el pedido (503)')
  })

  test('uses server error field on unknown error', async () => {
    global.fetch.mockReturnValue(makeResponse(503, { error: 'Service unavailable' }))
    await expect(createOrder(basePayload)).rejects.toThrow('Service unavailable')
  })
})
