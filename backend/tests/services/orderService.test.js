import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// ── Mocks ────────────────────────────────────────────────────────
const mockOrder = {
  findFirst: jest.fn(),
  create: jest.fn(),
  count: jest.fn(),
  findMany: jest.fn(),
}
const mockUser = { findUnique: jest.fn() }
const mockProduct = { findUnique: jest.fn() }
const mockOptionChoice = { findMany: jest.fn() }
const mockBlacklist = { findFirst: jest.fn() }
const mockOrderStatusHistory = { create: jest.fn() }
const mockAddress = { findUnique: jest.fn() }

const prismaMock = {
  order: mockOrder,
  user: mockUser,
  product: mockProduct,
  optionChoice: mockOptionChoice,
  blacklist: mockBlacklist,
  orderStatusHistory: mockOrderStatusHistory,
  address: mockAddress,
  $transaction: jest.fn(async (cb) => cb(prismaMock)),
}

jest.unstable_mockModule('../../src/config/prisma.js', () => ({ prisma: prismaMock }))

// Mock argon2 (imported indirectly via authService)
jest.unstable_mockModule('argon2', () => ({ default: { hash: jest.fn(), verify: jest.fn(), argon2id: 'argon2id' } }))

const { createOrder } = await import('../../src/services/orderService.js')

// ── Helpers ──────────────────────────────────────────────────────
const USER_ID = 'user-1'
const ADDR_ID = 'addr-1'
const IDEM_KEY = '550e8400-e29b-41d4-a716-446655440000'

const validUser = {
  email: 'test@example.com',
  phone: '+34612345678',
  phoneVerified: true,
  deletedAt: null,
}

const validAddress = {
  id: ADDR_ID,
  userId: USER_ID,
  label: 'Casa',
  street: 'Carrer Major',
  number: '1',
  floorDoor: null,
  postalCode: '08302',
  city: 'Mataró',
  notes: null,
  deletedAt: null,
}

const validProduct = { id: 'prod-1', name: 'Bocadillo', price: 5.5, available: true }

function baseData(overrides = {}) {
  return {
    idempotencyKey: IDEM_KEY,
    mode: 'PICKUP',
    paymentMethod: 'CASH',
    timing: 'ASAP',
    contactPhone: '612345678',
    items: [{ productId: 'prod-1', quantity: 2 }],
    ...overrides,
  }
}

function setupHappyPath(mode = 'PICKUP') {
  mockOrder.findFirst.mockResolvedValueOnce(null) // no existing idempotency match
  mockUser.findUnique.mockResolvedValueOnce(validUser)
  mockBlacklist.findFirst.mockResolvedValueOnce(null)
  mockProduct.findUnique.mockResolvedValue(validProduct)
  mockOptionChoice.findMany.mockResolvedValue([])
  // fraud detection
  mockOrder.count.mockResolvedValue(0)
  mockOrder.findMany.mockResolvedValue([])
  // transaction create
  const createdOrder = {
    id: 'order-1',
    status: 'PENDING',
    mode,
    paymentMethod: 'CASH',
    total: 11.0,
    orderLines: [],
  }
  mockOrder.create.mockResolvedValueOnce(createdOrder)
  mockOrderStatusHistory.create.mockResolvedValueOnce({})
  if (mode === 'DELIVERY') {
    mockAddress.findUnique.mockResolvedValueOnce(validAddress)
  }
  return createdOrder
}

beforeEach(() => {
  for (const model of [mockOrder, mockUser, mockProduct, mockOptionChoice, mockBlacklist, mockOrderStatusHistory, mockAddress]) {
    for (const fn of Object.values(model)) if (typeof fn.mockReset === 'function') fn.mockReset()
  }
  prismaMock.$transaction.mockReset()
  prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
})

// ── Tests ────────────────────────────────────────────────────────

describe('createOrder — PICKUP happy path', () => {
  it('returns order with alreadyExisted=false', async () => {
    setupHappyPath('PICKUP')
    const result = await createOrder(USER_ID, baseData())
    expect(result.alreadyExisted).toBe(false)
    expect(result.order.id).toBe('order-1')
  })

  it('creates an order status history entry', async () => {
    setupHappyPath('PICKUP')
    await createOrder(USER_ID, baseData())
    expect(mockOrderStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PENDING', note: 'Order created' }),
    }))
  })

  it('calculates the total server-side (ignores client total)', async () => {
    setupHappyPath('PICKUP')
    await createOrder(USER_ID, baseData())
    // product price 5.5 * quantity 2 = 11.0 passed to order.create
    expect(mockOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ total: 11.0 }),
    }))
  })
})

describe('createOrder — idempotency', () => {
  it('returns existing order when same idempotencyKey used within 24h', async () => {
    const existingOrder = { id: 'order-existing', status: 'PENDING', orderLines: [] }
    mockOrder.findFirst.mockResolvedValueOnce(existingOrder)
    const result = await createOrder(USER_ID, baseData())
    expect(result.alreadyExisted).toBe(true)
    expect(result.order.id).toBe('order-existing')
    // Should not create a new order
    expect(mockOrder.create).not.toHaveBeenCalled()
  })
})

describe('createOrder — DELIVERY mode', () => {
  it('resolves address snapshot and sets addressId', async () => {
    setupHappyPath('DELIVERY')
    const data = baseData({ mode: 'DELIVERY', addressId: ADDR_ID })
    const result = await createOrder(USER_ID, data)
    expect(result.alreadyExisted).toBe(false)
    expect(mockAddress.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ADDR_ID },
    }))
  })

  it('throws 400 when addressId belongs to a different user', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockAddress.findUnique.mockResolvedValueOnce({ ...validAddress, userId: 'other-user' })
    await expect(createOrder(USER_ID, baseData({ mode: 'DELIVERY', addressId: ADDR_ID }))).rejects.toMatchObject({ status: 400 })
  })

  it('throws 400 when addressId is not found', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockAddress.findUnique.mockResolvedValueOnce(null)
    await expect(createOrder(USER_ID, baseData({ mode: 'DELIVERY', addressId: 'nonexistent' }))).rejects.toMatchObject({ status: 400 })
  })

  it('throws 400 when addressId is soft-deleted', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockAddress.findUnique.mockResolvedValueOnce({ ...validAddress, deletedAt: new Date() })
    await expect(createOrder(USER_ID, baseData({ mode: 'DELIVERY', addressId: ADDR_ID }))).rejects.toMatchObject({ status: 400 })
  })
})

describe('createOrder — error cases', () => {
  it('throws 403 when user account is deleted', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce({ ...validUser, deletedAt: new Date() })
    await expect(createOrder(USER_ID, baseData())).rejects.toMatchObject({ status: 403 })
  })

  it('throws 403 when user not found', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(null)
    await expect(createOrder(USER_ID, baseData())).rejects.toMatchObject({ status: 403 })
  })

  it('throws 422 when a product does not exist', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockBlacklist.findFirst.mockResolvedValueOnce(null)
    mockProduct.findUnique.mockResolvedValueOnce(null)
    await expect(createOrder(USER_ID, baseData())).rejects.toMatchObject({ status: 422 })
  })

  it('throws 422 when a product is unavailable', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockBlacklist.findFirst.mockResolvedValueOnce(null)
    mockProduct.findUnique.mockResolvedValueOnce({ ...validProduct, available: false })
    await expect(createOrder(USER_ID, baseData())).rejects.toMatchObject({ status: 422 })
  })

  it('throws 403 when phone is blacklisted', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockBlacklist.findFirst.mockResolvedValueOnce({ id: 'bl-1', type: 'phone', value: '+34612345678' })
    await expect(createOrder(USER_ID, baseData())).rejects.toMatchObject({ status: 403 })
  })

  it('throws 422 for invalid Spanish phone in contactPhone', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    await expect(createOrder(USER_ID, baseData({ contactPhone: '123' }))).rejects.toMatchObject({ status: 422 })
  })
})

describe('createOrder — fraud detection', () => {
  it('sets fraudFlags when same phone+address appears twice in 5 minutes', async () => {
    // We need full happy path + fraud trigger
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockAddress.findUnique.mockResolvedValueOnce(validAddress)
    mockBlacklist.findFirst.mockResolvedValueOnce(null)
    mockProduct.findUnique.mockResolvedValue(validProduct)
    mockOptionChoice.findMany.mockResolvedValue([])
    // count >= 2 for rapid repeat check
    mockOrder.count.mockResolvedValueOnce(2) // rapid repeat
    mockOrder.count.mockResolvedValueOnce(1) // daily phone count (< 2, no flag)
    mockOrder.findMany.mockResolvedValue([]) // multiple phones check
    const createdOrder = { id: 'o2', status: 'PENDING', total: 11, orderLines: [] }
    mockOrder.create.mockResolvedValueOnce(createdOrder)
    mockOrderStatusHistory.create.mockResolvedValueOnce({})

    const result = await createOrder(USER_ID, baseData({ mode: 'DELIVERY', addressId: ADDR_ID }))
    expect(result.fraudFlags).toContain('RAPID_REPEAT_SAME_ADDRESS')
  })

  it('sets PHONE_EXCEEDS_DAILY_LIMIT when same phone has >= 2 orders in 24h (PICKUP)', async () => {
    // Manual setup to control fraud flags precisely
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockBlacklist.findFirst.mockResolvedValueOnce(null)
    mockProduct.findUnique.mockResolvedValueOnce(validProduct)
    mockOptionChoice.findMany.mockResolvedValueOnce([])
    // PICKUP: addressStr=null, so rapid repeat check is skipped
    // Only daily phone count is checked (once for PICKUP)
    mockOrder.count.mockResolvedValueOnce(2) // daily phone count >= 2 → flag
    mockOrder.findMany.mockResolvedValue([]) // multiple phones (addressStr null, so skipped)
    const createdOrder = { id: 'o-daily', status: 'PENDING', total: 11, orderLines: [] }
    mockOrder.create.mockResolvedValueOnce(createdOrder)
    mockOrderStatusHistory.create.mockResolvedValueOnce({})
    const result = await createOrder(USER_ID, baseData())
    expect(result.fraudFlags).toContain('PHONE_EXCEEDS_DAILY_LIMIT')
  })

  it('sets MULTIPLE_PHONES_SAME_ADDRESS when >= 3 different phones in 1h (DELIVERY)', async () => {
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(validUser)
    mockAddress.findUnique.mockResolvedValueOnce(validAddress)
    mockBlacklist.findFirst.mockResolvedValueOnce(null)
    mockProduct.findUnique.mockResolvedValue(validProduct)
    mockOptionChoice.findMany.mockResolvedValue([])
    // no rapid repeat, no daily limit
    mockOrder.count.mockResolvedValueOnce(0) // rapid repeat
    mockOrder.count.mockResolvedValueOnce(1) // daily count (< 2)
    // 3 different phones at same address
    mockOrder.findMany.mockResolvedValueOnce([
      { contactPhone: '+34611111111' },
      { contactPhone: '+34622222222' },
      { contactPhone: '+34633333333' },
    ])
    const createdOrder = { id: 'o3', status: 'PENDING', total: 11, orderLines: [] }
    mockOrder.create.mockResolvedValueOnce(createdOrder)
    mockOrderStatusHistory.create.mockResolvedValueOnce({})
    const result = await createOrder(USER_ID, baseData({ mode: 'DELIVERY', addressId: ADDR_ID }))
    expect(result.fraudFlags).toContain('MULTIPLE_PHONES_SAME_ADDRESS')
  })

  it('includes option priceDelta in total calculation', async () => {
    setupHappyPath('PICKUP')
    // Override product + options for delta test
    mockProduct.findUnique.mockReset()
    mockProduct.findUnique.mockResolvedValueOnce({ id: 'prod-1', name: 'Bocadillo', price: 5.0, available: true })
    mockOptionChoice.findMany.mockReset()
    mockOptionChoice.findMany.mockResolvedValueOnce([{ id: 'c1', label: 'Extra', priceDelta: 1.5 }])

    const dataWithOptions = baseData({
      items: [{ productId: 'prod-1', quantity: 1, selectedOptions: { 'group-1': 'c1' } }],
    })
    await createOrder(USER_ID, dataWithOptions)
    // total = (5.0 + 1.5) * 1 = 6.5
    expect(mockOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ total: 6.5 }),
    }))
  })

  it('handles items with empty selectedOptions object (no priceDelta)', async () => {
    setupHappyPath('PICKUP')
    mockProduct.findUnique.mockReset()
    mockProduct.findUnique.mockResolvedValueOnce(validProduct)
    const dataWithEmptyOptions = baseData({
      items: [{ productId: 'prod-1', quantity: 1, selectedOptions: {} }],
    })
    await createOrder(USER_ID, dataWithEmptyOptions)
    // total = 5.5 * 1 = 5.5 (no delta)
    expect(mockOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ total: 5.5 }),
    }))
  })

  it('uses scheduledFor when timing is SCHEDULED', async () => {
    setupHappyPath('PICKUP')
    const future = new Date(Date.now() + 3600000).toISOString()
    const data = baseData({ timing: 'SCHEDULED', scheduledFor: future })
    await createOrder(USER_ID, data)
    expect(mockOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ timing: 'SCHEDULED', scheduledFor: expect.any(Date) }),
    }))
  })
})
