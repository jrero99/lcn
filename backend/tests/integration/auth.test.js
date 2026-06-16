import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// ── Mocks registered BEFORE app import ──────────────────────────
const mockUser = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}
const mockAddress = { updateMany: jest.fn() }
const prismaMock = {
  user: mockUser,
  address: mockAddress,
  $transaction: jest.fn(async (cb) => cb(prismaMock)),
}
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ prisma: prismaMock }))

const mockArgon2 = { hash: jest.fn(), verify: jest.fn(), argon2id: 'argon2id' }
jest.unstable_mockModule('argon2', () => ({ default: mockArgon2 }))

const app = (await import('../../src/index.js')).default

const JWT_SECRET = process.env.JWT_SECRET

function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' })
}

const USER = {
  id: 'u1',
  email: 'test@example.com',
  firstName: 'Joan',
  lastName: 'Garcia',
  role: 'CUSTOMER',
  passwordHash: 'validhash',
  phone: '+34612345678',
  phoneVerified: false,
  deletedAt: null,
  acceptedMarketing: false,
  createdAt: new Date(),
}

beforeEach(() => {
  mockUser.findUnique.mockReset()
  mockUser.create.mockReset()
  mockUser.update.mockReset()
  mockAddress.updateMany.mockReset()
  mockArgon2.hash.mockReset()
  mockArgon2.verify.mockReset()
})

// ── POST /api/auth/register ──────────────────────────────────────
describe('POST /api/auth/register', () => {
  const validBody = {
    name: 'Joan',
    apellidos: 'Garcia',
    email: 'joan@example.com',
    password: 'securePass1',
    phone: '612345678',
    consentConditions: true,
    consentPrivacy: true,
    consentMarketing: false,
  }

  it('returns 201 with user info and sets cookie on success', async () => {
    mockArgon2.hash.mockResolvedValue('hashed-pw')
    mockUser.create.mockResolvedValue({ id: 'u1', email: 'joan@example.com', firstName: 'Joan', lastName: 'Garcia', role: 'CUSTOMER' })

    const res = await request(app).post('/api/auth/register').send(validBody)
    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('joan@example.com')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('returns 422 for missing required fields (no password)', async () => {
    const { password, ...rest } = validBody
    const res = await request(app).post('/api/auth/register').send(rest)
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('Validation error')
  })

  it('returns 422 for invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, email: 'bad' })
    expect(res.status).toBe(422)
  })

  it('returns 422 for invalid phone', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, phone: '123' })
    expect(res.status).toBe(422)
  })

  it('returns 403 when honeypot is filled', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, _honey: 'bot' })
    expect(res.status).toBe(403)
  })

  it('returns 409 when email already exists (Prisma P2002)', async () => {
    mockArgon2.hash.mockResolvedValue('hashed-pw')
    const p2002 = new Error('Unique constraint failed')
    p2002.code = 'P2002'
    mockUser.create.mockRejectedValue(p2002)
    const res = await request(app).post('/api/auth/register').send(validBody)
    expect(res.status).toBe(409)
  })

  it('returns 422 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, password: 'short' })
    expect(res.status).toBe(422)
  })
})

// ── POST /api/auth/login ─────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns 200 with user info and sets cookie on valid credentials', async () => {
    mockUser.findUnique.mockResolvedValue(USER)
    mockArgon2.verify.mockResolvedValue(true)
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'validpass' })
    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe('u1')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('returns 401 for wrong password', async () => {
    mockUser.findUnique.mockResolvedValue(USER)
    mockArgon2.verify.mockResolvedValue(false)
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown email', async () => {
    mockUser.findUnique.mockResolvedValue(null)
    mockArgon2.verify.mockRejectedValue(new Error('bad hash'))
    const res = await request(app).post('/api/auth/login').send({ email: 'ghost@x.com', password: 'any' })
    expect(res.status).toBe(401)
  })

  it('returns 422 for missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' })
    expect(res.status).toBe(422)
  })

  it('returns 401 for soft-deleted user', async () => {
    mockUser.findUnique.mockResolvedValue({ ...USER, deletedAt: new Date() })
    mockArgon2.verify.mockResolvedValue(true)
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'pass' })
    expect(res.status).toBe(401)
  })
})

// ── POST /api/auth/logout ────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('returns 200 and clears the cookie', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Logged out')
    // Cookie should be cleared (set to empty or expired)
    const cookie = (res.headers['set-cookie'] ?? []).join('')
    expect(cookie).toMatch(/lcn_token/)
  })
})

// ── GET /api/auth/me ─────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 200 with user info for a valid token', async () => {
    // requireAuth fetches user from DB
    mockUser.findUnique.mockResolvedValueOnce({ ...USER, deletedAt: null }) // requireAuth
    // authService.getMe fetches again
    mockUser.findUnique.mockResolvedValueOnce({ ...USER, createdAt: new Date() })
    const token = makeToken('u1')
    const res = await request(app).get('/api/auth/me').set('Cookie', `lcn_token=${token}`)
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('test@example.com')
  })

  it('returns 401 for an expired token', async () => {
    const expiredToken = jwt.sign({ sub: 'u1' }, JWT_SECRET, { expiresIn: '-1s' })
    const res = await request(app).get('/api/auth/me').set('Cookie', `lcn_token=${expiredToken}`)
    expect(res.status).toBe(401)
  })

  it('returns 403 for a deleted user', async () => {
    mockUser.findUnique.mockResolvedValue({ ...USER, deletedAt: new Date() })
    const token = makeToken('u1')
    const res = await request(app).get('/api/auth/me').set('Cookie', `lcn_token=${token}`)
    expect(res.status).toBe(403)
  })
})

// ── POST /api/auth/google ────────────────────────────────────────
describe('POST /api/auth/google', () => {
  it('returns 503 when GOOGLE_CLIENT_ID is not configured', async () => {
    const res = await request(app).post('/api/auth/google').send({ credential: 'a'.repeat(200) })
    expect(res.status).toBe(503)
  })

  it('returns 422 for missing credential', async () => {
    const res = await request(app).post('/api/auth/google').send({})
    expect(res.status).toBe(422)
  })

  it('returns 422 for too-short credential', async () => {
    const res = await request(app).post('/api/auth/google').send({ credential: 'short' })
    expect(res.status).toBe(422)
  })
})

// ── DELETE /api/users/me ─────────────────────────────────────────
describe('DELETE /api/users/me', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/users/me')
    expect(res.status).toBe(401)
  })

  it('returns 200 and clears cookie after deleting account', async () => {
    // requireAuth
    mockUser.findUnique.mockResolvedValueOnce({ ...USER, deletedAt: null })
    // softDeleteAllUserAddresses (via authService.deleteAccount dynamic import)
    mockAddress.updateMany.mockResolvedValue({ count: 0 })
    // user.update (anonymise)
    mockUser.update.mockResolvedValue({})
    const token = makeToken('u1')
    const res = await request(app).delete('/api/users/me').set('Cookie', `lcn_token=${token}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Account deleted')
  })
})
