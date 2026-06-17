import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'

const mockUser = { findUnique: jest.fn() }
const mockOrder = {
  findMany: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
}
const mockOrderStatusHistory = { create: jest.fn() }
const mockCategory = { findMany: jest.fn() }
const mockProduct = { create: jest.fn(), update: jest.fn(), delete: jest.fn() }
const mockBlacklist = { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() }
const mockAddress = { findMany: jest.fn() }

const prismaMock = {
  user: mockUser,
  order: mockOrder,
  orderStatusHistory: mockOrderStatusHistory,
  category: mockCategory,
  product: mockProduct,
  blacklist: mockBlacklist,
  address: mockAddress,
  $transaction: jest.fn(async (cb) => cb(prismaMock)),
}
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ prisma: prismaMock }))
jest.unstable_mockModule('argon2', () => ({ default: { hash: jest.fn(), verify: jest.fn(), argon2id: 'argon2id' } }))

const app = (await import('../../src/index.js')).default

const JWT_SECRET = process.env.JWT_SECRET

function makeToken(userId, role = 'ADMIN') {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: '1h' })
}

const adminUser = {
  id: 'admin-1',
  email: 'admin@lcn.com',
  firstName: 'Admin',
  lastName: 'LCN',
  role: 'ADMIN',
  phoneVerified: true,
  deletedAt: null,
}

const customerUser = {
  ...adminUser,
  id: 'customer-1',
  role: 'CUSTOMER',
}

beforeEach(() => {
  for (const m of [mockUser, mockOrder, mockOrderStatusHistory, mockCategory, mockProduct, mockBlacklist, mockAddress]) {
    for (const fn of Object.values(m)) if (fn.mockReset) fn.mockReset()
  }
  prismaMock.$transaction.mockReset()
  prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
})

// ── Auth guards ───────────────────────────────────────────────────
describe('Admin route auth guards', () => {
  it('returns 401 for GET /api/admin/orders without token', async () => {
    const res = await request(app).get('/api/admin/orders')
    expect(res.status).toBe(401)
  })

  it('returns 403 for GET /api/admin/orders with CUSTOMER role', async () => {
    mockUser.findUnique.mockResolvedValue(customerUser)
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', `lcn_token=${makeToken('customer-1', 'CUSTOMER')}`)
    expect(res.status).toBe(403)
  })
})

// ── GET /api/admin/orders ────────────────────────────────────────
describe('GET /api/admin/orders', () => {
  const sampleOrder = {
    id: 'o1',
    status: 'PENDING',
    mode: 'DELIVERY',
    timing: 'ASAP',
    paymentMethod: 'CASH',
    total: 11.0,
    contactPhone: '+34612345678',
    deliveryAddress: 'Carrer Major 1, 08302 Mataró',
    notes: null,
    createdAt: new Date(),
    user: { id: 'u1', firstName: 'Joan', lastName: 'G', email: 'j@g.com', phone: '+34612345678' },
    orderLines: [{
      id: 'l1',
      productNameSnapshot: 'Bocadillo',
      unitPriceSnapshot: 5.5,
      quantity: 2,
      lineTotal: 11.0,
      selectedOptions: null,
      removedIngredients: [],
      notes: null,
    }],
    statusHistory: [],
  }

  it('returns 200 with paginated orders list (empty)', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockOrder.findMany.mockResolvedValue([])
    mockOrder.count.mockResolvedValue(0)
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.pagination).toBeDefined()
  })

  it('maps orders with user and orderLines correctly', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockOrder.findMany.mockResolvedValue([sampleOrder])
    mockOrder.count.mockResolvedValue(1)
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(200)
    const order = res.body.data[0]
    expect(order.id).toBe('o1')
    expect(order.user.name).toBe('Joan G')
    expect(order.lines).toHaveLength(1)
    expect(order.lines[0].productName).toBe('Bocadillo')
    expect(order.total).toBe(11.0)
  })

  it('maps order with null user correctly', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockOrder.findMany.mockResolvedValue([{ ...sampleOrder, user: null }])
    mockOrder.count.mockResolvedValue(1)
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.body.data[0].user).toBeNull()
  })

  it('supports ?status= filter', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockOrder.findMany.mockResolvedValue([])
    mockOrder.count.mockResolvedValue(0)
    const res = await request(app)
      .get('/api/admin/orders?status=PENDING')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(200)
    expect(mockOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'PENDING' },
    }))
  })

  it('supports pagination params', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockOrder.findMany.mockResolvedValue([])
    mockOrder.count.mockResolvedValue(50)
    const res = await request(app)
      .get('/api/admin/orders?page=2&limit=10')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.body.pagination.page).toBe(2)
    expect(res.body.pagination.limit).toBe(10)
  })
})

// ── PATCH /api/admin/orders/:id ──────────────────────────────────
describe('PATCH /api/admin/orders/:id', () => {
  it('returns 200 on valid status update', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const updatedOrder = { id: 'o1', status: 'CONFIRMED', updatedAt: new Date() }
    mockOrder.update.mockResolvedValue(updatedOrder)
    mockOrderStatusHistory.create.mockResolvedValue({})

    const res = await request(app)
      .patch('/api/admin/orders/o1')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ status: 'CONFIRMED', note: 'Ready soon' })
    expect(res.status).toBe(200)
    expect(res.body.order.status).toBe('CONFIRMED')
  })

  it('returns 422 for invalid status', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const res = await request(app)
      .patch('/api/admin/orders/o1')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ status: 'SHIPPED' })
    expect(res.status).toBe(422)
  })

  it('returns 404 when order not found (Prisma P2025)', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const p2025 = new Error('Record not found')
    p2025.code = 'P2025'
    prismaMock.$transaction.mockImplementationOnce(async () => { throw p2025 })
    const res = await request(app)
      .patch('/api/admin/orders/nonexistent')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ status: 'CANCELLED' })
    expect(res.status).toBe(404)
  })
})

// ── GET /api/admin/catalog ───────────────────────────────────────
describe('GET /api/admin/catalog', () => {
  it('returns 200 with categories', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockCategory.findMany.mockResolvedValue([])
    const res = await request(app)
      .get('/api/admin/catalog')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// ── POST /api/admin/catalog/products ────────────────────────────
describe('POST /api/admin/catalog/products', () => {
  it('returns 201 with the created product (no allergens)', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockProduct.create.mockResolvedValue({
      id: 'p1', name: 'New Product', price: 3.5,
      productAllergens: [], optionGroups: [], categoryId: 'cat-1',
    })
    const res = await request(app)
      .post('/api/admin/catalog/products')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ categoryId: 'cat-1', name: 'New Product', price: 3.5 })
    expect(res.status).toBe(201)
    expect(res.body.product.id).toBe('p1')
  })

  it('returns 201 with allergens included', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockProduct.create.mockResolvedValue({
      id: 'p2', name: 'Product With Allergens', price: 4.0,
      productAllergens: [{ allergen: { name: 'Gluten' } }],
      optionGroups: [], categoryId: 'cat-1',
    })
    const res = await request(app)
      .post('/api/admin/catalog/products')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ categoryId: 'cat-1', name: 'Product With Allergens', price: 4.0, allergenIds: ['allergen-1'] })
    expect(res.status).toBe(201)
  })

  it('returns 422 for missing name', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const res = await request(app)
      .post('/api/admin/catalog/products')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ categoryId: 'cat-1', price: 3.5 })
    expect(res.status).toBe(422)
  })
})

// ── PATCH /api/admin/catalog/products/:id ───────────────────────
describe('PATCH /api/admin/catalog/products/:id', () => {
  it('returns 200 on valid product update', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockProduct.update.mockResolvedValue({
      id: 'p1', name: 'Updated', price: 4.0, productAllergens: [], optionGroups: [],
    })
    const res = await request(app)
      .patch('/api/admin/catalog/products/p1')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ name: 'Updated' })
    expect(res.status).toBe(200)
  })

  it('returns 404 when product not found (P2025)', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const p2025 = new Error('Not found')
    p2025.code = 'P2025'
    mockProduct.update.mockRejectedValue(p2025)
    const res = await request(app)
      .patch('/api/admin/catalog/products/nonexistent')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ name: 'x' })
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/admin/catalog/products/:id ───────────────────────
describe('DELETE /api/admin/catalog/products/:id', () => {
  it('returns 204 on successful delete', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockProduct.delete.mockResolvedValue({})
    const res = await request(app)
      .delete('/api/admin/catalog/products/p1')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(204)
  })

  it('returns 404 when product not found', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const p2025 = new Error('Not found')
    p2025.code = 'P2025'
    mockProduct.delete.mockRejectedValue(p2025)
    const res = await request(app)
      .delete('/api/admin/catalog/products/nonexistent')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(404)
  })
})

// ── GET /api/admin/users ─────────────────────────────────────────
describe('GET /api/admin/users', () => {
  it('returns 200 with user list (empty)', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockUser.findMany = jest.fn().mockResolvedValue([])
    mockUser.count = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('maps user data correctly with name field', async () => {
    const sampleCustomer = {
      id: 'u1', firstName: 'Joan', lastName: 'Garcia',
      email: 'joan@example.com', phone: '+34612345678',
      phoneVerified: false, createdAt: new Date(),
      _count: { orders: 3 },
    }
    mockUser.findUnique.mockResolvedValueOnce(adminUser)
    mockUser.findMany = jest.fn().mockResolvedValue([sampleCustomer])
    mockUser.count = jest.fn().mockResolvedValue(1)
    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(200)
    expect(res.body.data[0].name).toBe('Joan Garcia')
    expect(res.body.data[0]._count.orders).toBe(3)
  })
})

// ── GET /api/admin/users/:id/addresses ──────────────────────────
describe('GET /api/admin/users/:id/addresses', () => {
  it('returns 404 when user not found', async () => {
    mockUser.findUnique.mockResolvedValueOnce(adminUser) // requireAuth
    mockUser.findUnique.mockResolvedValueOnce(null)       // getUserAddresses user lookup
    const res = await request(app)
      .get('/api/admin/users/ghost/addresses')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(404)
  })

  it('returns 200 with addresses list when user exists', async () => {
    mockUser.findUnique.mockResolvedValueOnce(adminUser)
    mockUser.findUnique.mockResolvedValueOnce({ id: 'u1' })
    mockOrder.findMany.mockResolvedValue([])
    const res = await request(app)
      .get('/api/admin/users/u1/addresses')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(200)
    expect(res.body.addresses).toBeDefined()
  })
})

// ── GET /api/admin/blacklist ────────────────────────────────────
describe('GET /api/admin/blacklist', () => {
  it('returns 200 with blacklist entries', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockBlacklist.findMany.mockResolvedValue([])
    const res = await request(app)
      .get('/api/admin/blacklist')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })
})

// ── POST /api/admin/blacklist ────────────────────────────────────
describe('POST /api/admin/blacklist', () => {
  it('returns 201 with the created entry (default expiresAt)', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const entry = { id: 'bl-1', type: 'phone', value: '+34612345678', reason: 'Fraud', expiresAt: new Date() }
    mockBlacklist.create.mockResolvedValue(entry)
    const res = await request(app)
      .post('/api/admin/blacklist')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ type: 'phone', value: '+34612345678', reason: 'Fraud attempt' })
    expect(res.status).toBe(201)
    expect(res.body.entry.type).toBe('phone')
  })

  it('returns 201 with explicit expiresAt', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString()
    const entry = { id: 'bl-2', type: 'email', value: 'bad@actor.com', reason: 'Spam', expiresAt: new Date(futureDate) }
    mockBlacklist.create.mockResolvedValue(entry)
    const res = await request(app)
      .post('/api/admin/blacklist')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ type: 'email', value: 'bad@actor.com', reason: 'Spam', expiresAt: futureDate })
    expect(res.status).toBe(201)
  })

  it('returns 422 for invalid type', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const res = await request(app)
      .post('/api/admin/blacklist')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
      .send({ type: 'uuid', value: 'x', reason: 'test' })
    expect(res.status).toBe(422)
  })
})

// ── DELETE /api/admin/blacklist/:id ─────────────────────────────
describe('DELETE /api/admin/blacklist/:id', () => {
  it('returns 204 on success', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    mockBlacklist.delete.mockResolvedValue({})
    const res = await request(app)
      .delete('/api/admin/blacklist/bl-1')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(204)
  })

  it('returns 404 when entry not found', async () => {
    mockUser.findUnique.mockResolvedValue(adminUser)
    const p2025 = new Error('Not found')
    p2025.code = 'P2025'
    mockBlacklist.delete.mockRejectedValue(p2025)
    const res = await request(app)
      .delete('/api/admin/blacklist/nonexistent')
      .set('Cookie', `lcn_token=${makeToken('admin-1')}`)
    expect(res.status).toBe(404)
  })
})
