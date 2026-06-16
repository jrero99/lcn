import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'

const mockUser = { findUnique: jest.fn() }
const mockAddress = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  count: jest.fn(),
}
const prismaMock = {
  user: mockUser,
  address: mockAddress,
  $transaction: jest.fn(async (cb) => cb(prismaMock)),
}
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ prisma: prismaMock }))
jest.unstable_mockModule('argon2', () => ({ default: { hash: jest.fn(), verify: jest.fn(), argon2id: 'argon2id' } }))

const app = (await import('../../src/index.js')).default

const JWT_SECRET = process.env.JWT_SECRET
const USER_ID = 'user-test-1'
const OTHER_USER_ID = 'user-test-2'
const ADDR_ID = 'addr-uuid-1'
const OTHER_ADDR_ID = 'addr-uuid-2'

function token(userId = USER_ID) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' })
}

const authUser = {
  id: USER_ID,
  email: 'test@example.com',
  firstName: 'Joan',
  lastName: 'Garcia',
  role: 'CUSTOMER',
  phoneVerified: false,
  deletedAt: null,
}

const sampleAddress = {
  id: ADDR_ID,
  userId: USER_ID,
  label: 'Casa',
  street: 'Carrer de Barcelona',
  number: '12',
  floorDoor: '3r 2a',
  postalCode: '08302',
  city: 'Mataró',
  notes: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const validBody = {
  label: 'Casa',
  street: 'Carrer de Barcelona',
  number: '12',
  floorDoor: '3r 2a',
  postalCode: '08302',
  city: 'Mataró',
}

beforeEach(() => {
  mockUser.findUnique.mockReset()
  mockAddress.findMany.mockReset()
  mockAddress.findUnique.mockReset()
  mockAddress.create.mockReset()
  mockAddress.update.mockReset()
  mockAddress.updateMany.mockReset()
  mockAddress.count.mockReset()
})

// ── GET /api/addresses ───────────────────────────────────────────
describe('GET /api/addresses', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/addresses')
    expect(res.status).toBe(401)
  })

  it('returns 200 with addresses array for authenticated user', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findMany.mockResolvedValue([sampleAddress])
    const res = await request(app).get('/api/addresses').set('Cookie', `lcn_token=${token()}`)
    expect(res.status).toBe(200)
    expect(res.body.addresses).toHaveLength(1)
  })

  it('returns only addresses for the authenticated user', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findMany.mockResolvedValue([sampleAddress]) // service filters by userId
    const res = await request(app).get('/api/addresses').set('Cookie', `lcn_token=${token()}`)
    // Verify the query was called with the correct userId
    expect(mockAddress.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: USER_ID }),
    }))
  })

  it('returns 200 with empty array when no addresses', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findMany.mockResolvedValue([])
    const res = await request(app).get('/api/addresses').set('Cookie', `lcn_token=${token()}`)
    expect(res.status).toBe(200)
    expect(res.body.addresses).toEqual([])
  })
})

// ── POST /api/addresses ──────────────────────────────────────────
describe('POST /api/addresses', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/addresses').send(validBody)
    expect(res.status).toBe(401)
  })

  it('returns 201 with the created address', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.count.mockResolvedValue(0)
    mockAddress.create.mockResolvedValue({ ...sampleAddress })
    const res = await request(app).post('/api/addresses').set('Cookie', `lcn_token=${token()}`).send(validBody)
    expect(res.status).toBe(201)
    expect(res.body.address.id).toBe(ADDR_ID)
  })

  it('returns 422 for out-of-zone CP (Madrid)', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    const res = await request(app)
      .post('/api/addresses')
      .set('Cookie', `lcn_token=${token()}`)
      .send({ ...validBody, postalCode: '28001', city: 'Madrid' })
    expect(res.status).toBe(422)
  })

  it('returns 422 when user already has 10 addresses', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.count.mockResolvedValue(10)
    const res = await request(app).post('/api/addresses').set('Cookie', `lcn_token=${token()}`).send(validBody)
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/maximum/)
  })

  it('returns 422 for missing required street field', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    const { street, ...rest } = validBody
    const res = await request(app).post('/api/addresses').set('Cookie', `lcn_token=${token()}`).send(rest)
    expect(res.status).toBe(422)
  })

  it('returns 422 for invalid postalCode format', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    const res = await request(app)
      .post('/api/addresses')
      .set('Cookie', `lcn_token=${token()}`)
      .send({ ...validBody, postalCode: 'abcde' })
    expect(res.status).toBe(422)
  })
})

// ── PATCH /api/addresses/:id ─────────────────────────────────────
describe('PATCH /api/addresses/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch(`/api/addresses/${ADDR_ID}`).send({ number: '5' })
    expect(res.status).toBe(401)
  })

  it('returns 200 with updated address', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue(sampleAddress)
    mockAddress.update.mockResolvedValue({ ...sampleAddress, number: '99' })
    const res = await request(app)
      .patch(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
      .send({ number: '99' })
    expect(res.status).toBe(200)
    expect(res.body.address.number).toBe('99')
  })

  it('returns 404 when address belongs to another user (IDOR prevention)', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddress, userId: OTHER_USER_ID })
    const res = await request(app)
      .patch(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
      .send({ number: '5' })
    expect(res.status).toBe(404)
  })

  it('returns 404 when address not found', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .patch(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
      .send({ number: '5' })
    expect(res.status).toBe(404)
  })

  it('returns 422 for empty body (no fields)', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    const res = await request(app)
      .patch(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
      .send({})
    expect(res.status).toBe(422)
  })

  // M-1 zone validation cases (as specified in AGENT_LOG)
  it('returns 422 for PATCH city=Barcelona with existing postalCode=28001 (both out-of-zone)', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddress, postalCode: '28001', city: 'Reus' })
    const res = await request(app)
      .patch(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
      .send({ city: 'Barcelona' })
    expect(res.status).toBe(422)
  })

  it('returns 422 for PATCH postalCode=28001 with existing city=Reus', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddress, postalCode: '08302', city: 'Reus' })
    const res = await request(app)
      .patch(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
      .send({ postalCode: '28001' })
    expect(res.status).toBe(422)
  })

  it('returns 200 for PATCH postalCode=08302 with existing city=Reus (CP valid compensates)', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddress, city: 'Reus', postalCode: '22000' })
    mockAddress.update.mockResolvedValue({ ...sampleAddress, postalCode: '08302' })
    const res = await request(app)
      .patch(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
      .send({ postalCode: '08302' })
    expect(res.status).toBe(200)
  })

  it('returns 200 for PATCH city=Mataró with existing postalCode=28001 (city valid compensates)', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddress, city: 'Reus', postalCode: '28001' })
    mockAddress.update.mockResolvedValue({ ...sampleAddress, city: 'Mataró' })
    const res = await request(app)
      .patch(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
      .send({ city: 'Mataró' })
    expect(res.status).toBe(200)
  })
})

// ── DELETE /api/addresses/:id ────────────────────────────────────
describe('DELETE /api/addresses/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`/api/addresses/${ADDR_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns 204 on successful soft-delete', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue(sampleAddress)
    mockAddress.update.mockResolvedValue({ ...sampleAddress, deletedAt: new Date() })
    const res = await request(app)
      .delete(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
    expect(res.status).toBe(204)
  })

  it('returns 404 when address belongs to another user (IDOR prevention)', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddress, userId: OTHER_USER_ID })
    const res = await request(app)
      .delete(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
    expect(res.status).toBe(404)
  })

  it('returns 404 when address not found', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .delete(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
    expect(res.status).toBe(404)
  })

  it('returns 404 when address is already soft-deleted', async () => {
    mockUser.findUnique.mockResolvedValue(authUser)
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddress, deletedAt: new Date() })
    const res = await request(app)
      .delete(`/api/addresses/${ADDR_ID}`)
      .set('Cookie', `lcn_token=${token()}`)
    expect(res.status).toBe(404)
  })
})
