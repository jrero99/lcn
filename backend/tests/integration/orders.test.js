import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'

const mockUser = { findUnique: jest.fn() }
const mockAddress = { findUnique: jest.fn() }
const mockOrder = { findFirst: jest.fn(), create: jest.fn(), count: jest.fn(), findMany: jest.fn() }
const mockProduct = { findUnique: jest.fn() }
const mockOptionChoice = { findMany: jest.fn() }
const mockBlacklist = { findFirst: jest.fn() }
const mockOrderStatusHistory = { create: jest.fn() }

const prismaMock = {
  user: mockUser,
  address: mockAddress,
  order: mockOrder,
  product: mockProduct,
  optionChoice: mockOptionChoice,
  blacklist: mockBlacklist,
  orderStatusHistory: mockOrderStatusHistory,
  $transaction: jest.fn(async (cb) => cb(prismaMock)),
}
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ prisma: prismaMock }))
jest.unstable_mockModule('argon2', () => ({ default: { hash: jest.fn(), verify: jest.fn(), argon2id: 'argon2id' } }))

const app = (await import('../../src/index.js')).default

const JWT_SECRET = process.env.JWT_SECRET
const USER_ID = 'user-orders-1'
const ADDR_ID = '660e8400-e29b-41d4-a716-446655440002'
const IDEM_KEY = '550e8400-e29b-41d4-a716-446655440000'

function token(userId = USER_ID) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' })
}

const authUser = {
  id: USER_ID,
  email: 'orders@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'CUSTOMER',
  phoneVerified: false,
  deletedAt: null,
}

const dbUser = {
  email: 'orders@example.com',
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

const pickupBody = {
  idempotencyKey: IDEM_KEY,
  mode: 'PICKUP',
  paymentMethod: 'CASH',
  timing: 'ASAP',
  contactPhone: '612345678',
  items: [{ productId: 'prod-1', quantity: 2 }],
}

const deliveryBody = {
  ...pickupBody,
  idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
  mode: 'DELIVERY',
  addressId: ADDR_ID,
}

function setupHappyPath(mode = 'PICKUP') {
  mockOrder.findFirst.mockResolvedValueOnce(null)
  mockUser.findUnique.mockResolvedValueOnce(dbUser)
  mockBlacklist.findFirst.mockResolvedValueOnce(null)
  mockProduct.findUnique.mockResolvedValue(validProduct)
  mockOptionChoice.findMany.mockResolvedValue([])
  mockOrder.count.mockResolvedValue(0)
  mockOrder.findMany.mockResolvedValue([])
  const created = { id: 'o1', status: 'PENDING', mode, paymentMethod: 'CASH', total: 11, orderLines: [] }
  mockOrder.create.mockResolvedValueOnce(created)
  mockOrderStatusHistory.create.mockResolvedValueOnce({})
  if (mode === 'DELIVERY') {
    mockAddress.findUnique.mockResolvedValueOnce(validAddress)
  }
  return created
}

beforeEach(() => {
  for (const m of [mockUser, mockAddress, mockOrder, mockProduct, mockOptionChoice, mockBlacklist, mockOrderStatusHistory]) {
    for (const fn of Object.values(m)) if (fn.mockReset) fn.mockReset()
  }
  prismaMock.$transaction.mockReset()
  prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
})

describe('POST /api/orders', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/orders').send(pickupBody)
    expect(res.status).toBe(401)
  })

  it('returns 201 for valid PICKUP order', async () => {
    // requireAuth user lookup
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    setupHappyPath('PICKUP')
    const res = await request(app).post('/api/orders').set('Cookie', `lcn_token=${token()}`).send(pickupBody)
    expect(res.status).toBe(201)
    expect(res.body.orderId).toBe('o1')
    expect(res.body.confirmationTitle).toBe('¡Pedido recibido!')
  })

  it('returns 200 for repeated order (idempotency)', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    const existingOrder = { id: 'o-existing', status: 'PENDING', orderLines: [] }
    mockOrder.findFirst.mockResolvedValueOnce(existingOrder)
    const res = await request(app).post('/api/orders').set('Cookie', `lcn_token=${token()}`).send(pickupBody)
    expect(res.status).toBe(200)
    expect(res.body.orderId).toBe('o-existing')
    expect(res.body.confirmationTitle).toBeUndefined()
  })

  it('returns 201 for valid DELIVERY order with addressId', async () => {
    // First call: requireAuth middleware (needs authUser with role/deletedAt)
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    // Remaining calls: inside createOrder (needs dbUser fields like phone/email)
    setupHappyPath('DELIVERY')
    const res = await request(app).post('/api/orders').set('Cookie', `lcn_token=${token()}`).send(deliveryBody)
    expect(res.status).toBe(201)
  })

  it('returns 422 for DELIVERY without addressId', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    const { addressId, ...body } = deliveryBody
    const res = await request(app).post('/api/orders').set('Cookie', `lcn_token=${token()}`).send(body)
    expect(res.status).toBe(422)
  })

  it('returns 400 for DELIVERY with addressId belonging to another user', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(dbUser)
    mockAddress.findUnique.mockResolvedValueOnce({ ...validAddress, userId: 'other-user' })
    const res = await request(app).post('/api/orders').set('Cookie', `lcn_token=${token()}`).send(deliveryBody)
    expect(res.status).toBe(400)
  })

  it('returns 422 for invalid idempotencyKey', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `lcn_token=${token()}`)
      .send({ ...pickupBody, idempotencyKey: 'not-a-uuid' })
    expect(res.status).toBe(422)
  })

  it('returns 422 for empty items array', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `lcn_token=${token()}`)
      .send({ ...pickupBody, items: [] })
    expect(res.status).toBe(422)
  })

  it('returns 403 when honeypot is filled', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `lcn_token=${token()}`)
      .send({ ...pickupBody, _honey: 'bot' })
    expect(res.status).toBe(403)
  })

  it('returns 422 when product not found', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(dbUser)
    mockBlacklist.findFirst.mockResolvedValueOnce(null)
    mockProduct.findUnique.mockResolvedValueOnce(null)
    const res = await request(app).post('/api/orders').set('Cookie', `lcn_token=${token()}`).send(pickupBody)
    expect(res.status).toBe(422)
  })

  it('returns 422 when product is unavailable', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(dbUser)
    mockBlacklist.findFirst.mockResolvedValueOnce(null)
    mockProduct.findUnique.mockResolvedValueOnce({ ...validProduct, available: false })
    const res = await request(app).post('/api/orders').set('Cookie', `lcn_token=${token()}`).send(pickupBody)
    expect(res.status).toBe(422)
  })

  it('returns 403 when user is blacklisted', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    mockOrder.findFirst.mockResolvedValueOnce(null)
    mockUser.findUnique.mockResolvedValueOnce(dbUser)
    mockBlacklist.findFirst.mockResolvedValueOnce({ id: 'bl-1', type: 'email', value: 'orders@example.com' })
    const res = await request(app).post('/api/orders').set('Cookie', `lcn_token=${token()}`).send(pickupBody)
    expect(res.status).toBe(403)
  })

  it('returns 422 for invalid contactPhone', async () => {
    mockUser.findUnique.mockResolvedValueOnce(authUser)
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `lcn_token=${token()}`)
      .send({ ...pickupBody, contactPhone: '000' })
    expect(res.status).toBe(422)
  })
})
