// adminService.test.js — unit tests for the admin service layer.
import {
  fetchAdminOrders,
  updateOrderStatus,
  fetchAdminCatalog,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchAdminUsers,
  fetchUserAddresses,
  fetchBlacklist,
  addBlacklistEntry,
  deleteBlacklistEntry,
} from '../../services/adminService.js'
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

describe('fetchAdminOrders', () => {
  test('calls GET /api/admin/orders with default params', async () => {
    global.fetch.mockReturnValue(makeResponse(200, { orders: [] }))
    await fetchAdminOrders()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/admin\/orders\?/),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  test('includes status param when provided', async () => {
    global.fetch.mockReturnValue(makeResponse(200, { orders: [] }))
    await fetchAdminOrders({ status: 'PENDING', page: 2, limit: 10 })
    const url = global.fetch.mock.calls[0][0]
    expect(url).toContain('status=PENDING')
    expect(url).toContain('page=2')
    expect(url).toContain('limit=10')
  })

  test('calls notifyUnauthorized on 401', async () => {
    global.fetch.mockReturnValue(makeResponse(401, {}))
    await expect(fetchAdminOrders()).rejects.toThrow()
    expect(sessionEvents.notifyUnauthorized).toHaveBeenCalled()
  })

  test('returns null on 204', async () => {
    global.fetch.mockReturnValue(Promise.resolve({ ok: true, status: 204, json: vi.fn() }))
    const result = await fetchAdminOrders()
    expect(result).toBeNull()
  })
})

describe('updateOrderStatus', () => {
  test('calls PATCH /api/admin/orders/:id', async () => {
    global.fetch.mockReturnValue(makeResponse(200, { order: { id: 'o1', status: 'CONFIRMED' } }))
    await updateOrderStatus('o1', { status: 'CONFIRMED' })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/orders/o1'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })
})

describe('fetchAdminCatalog', () => {
  test('resolves on 200', async () => {
    global.fetch.mockReturnValue(makeResponse(200, { categories: [] }))
    const result = await fetchAdminCatalog()
    expect(result).toEqual({ categories: [] })
  })
})

describe('createProduct', () => {
  test('calls POST /api/admin/catalog/products', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { product: { id: 'p1' } }))
    await createProduct({ name: 'Test', price: 5.5, categoryId: 'c1' })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/catalog/products'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('updateProduct', () => {
  test('calls PATCH /api/admin/catalog/products/:id', async () => {
    global.fetch.mockReturnValue(makeResponse(200, { product: { id: 'p1' } }))
    await updateProduct('p1', { price: 6.0 })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/catalog/products/p1'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })
})

describe('deleteProduct', () => {
  test('calls DELETE /api/admin/catalog/products/:id', async () => {
    global.fetch.mockReturnValue(Promise.resolve({ ok: true, status: 204, json: vi.fn() }))
    await deleteProduct('p1')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/catalog/products/p1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  test('throws with error message on failure', async () => {
    global.fetch.mockReturnValue(makeResponse(500, { message: 'Cannot delete' }))
    await expect(deleteProduct('p1')).rejects.toThrow('Cannot delete')
  })
})

describe('fetchAdminUsers', () => {
  test('calls GET /api/admin/users with pagination params', async () => {
    global.fetch.mockReturnValue(makeResponse(200, { users: [] }))
    await fetchAdminUsers({ page: 3, limit: 5 })
    const url = global.fetch.mock.calls[0][0]
    expect(url).toContain('page=3')
    expect(url).toContain('limit=5')
  })
})

describe('fetchUserAddresses', () => {
  test('calls GET /api/admin/users/:id/addresses', async () => {
    global.fetch.mockReturnValue(makeResponse(200, { addresses: [] }))
    await fetchUserAddresses('u1')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users/u1/addresses'),
      expect.any(Object)
    )
  })
})

describe('fetchBlacklist', () => {
  test('resolves on 200', async () => {
    global.fetch.mockReturnValue(makeResponse(200, { entries: [] }))
    const result = await fetchBlacklist()
    expect(result).toEqual({ entries: [] })
  })
})

describe('addBlacklistEntry', () => {
  test('calls POST /api/admin/blacklist', async () => {
    global.fetch.mockReturnValue(makeResponse(201, { entry: { id: 'bl1' } }))
    await addBlacklistEntry({ type: 'phone', value: '+34600000000', reason: 'spam' })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/blacklist'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('deleteBlacklistEntry', () => {
  test('calls DELETE /api/admin/blacklist/:id', async () => {
    global.fetch.mockReturnValue(Promise.resolve({ ok: true, status: 204, json: vi.fn() }))
    await deleteBlacklistEntry('bl1')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/blacklist/bl1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
