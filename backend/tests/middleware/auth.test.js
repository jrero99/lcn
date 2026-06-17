import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import jwt from 'jsonwebtoken'

// ── Mock prisma ──────────────────────────────────────────────────
const mockUser = { findUnique: jest.fn() }
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
  prisma: { user: mockUser },
}))

const { requireAuth, requireAdmin } = await import('../../src/middleware/auth.js')

const JWT_SECRET = process.env.JWT_SECRET

function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' })
}

function makeRes() {
  return {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this },
    json(body) { this._body = body; return this },
  }
}

const SAMPLE_USER = {
  id: 'u1',
  email: 'test@example.com',
  firstName: 'Joan',
  lastName: 'Garcia',
  role: 'CUSTOMER',
  phoneVerified: false,
  deletedAt: null,
}

beforeEach(() => {
  mockUser.findUnique.mockReset()
})

// ── requireAuth ──────────────────────────────────────────────────
describe('requireAuth', () => {
  it('calls next() and attaches user when token is valid', async () => {
    mockUser.findUnique.mockResolvedValue(SAMPLE_USER)
    const req = { cookies: { lcn_token: makeToken('u1') } }
    const res = makeRes()
    const next = jest.fn()
    await requireAuth(req, res, next)
    expect(next).toHaveBeenCalledWith() // no error argument
    expect(req.user).toEqual(SAMPLE_USER)
  })

  it('returns 401 when no token cookie', async () => {
    const req = { cookies: {} }
    const res = makeRes()
    const next = jest.fn()
    await requireAuth(req, res, next)
    expect(res._status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next(err) for invalid token (triggers errorHandler JWT branch)', async () => {
    const req = { cookies: { lcn_token: 'invalid.token.here' } }
    const res = makeRes()
    const next = jest.fn()
    await requireAuth(req, res, next)
    // jwt.verify throws JsonWebTokenError → caught → next(err)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('returns 403 when user is soft-deleted', async () => {
    mockUser.findUnique.mockResolvedValue({ ...SAMPLE_USER, deletedAt: new Date() })
    const req = { cookies: { lcn_token: makeToken('u1') } }
    const res = makeRes()
    const next = jest.fn()
    await requireAuth(req, res, next)
    expect(res._status).toBe(403)
  })

  it('returns 403 when user is not found in DB', async () => {
    mockUser.findUnique.mockResolvedValue(null)
    const req = { cookies: { lcn_token: makeToken('ghost') } }
    const res = makeRes()
    const next = jest.fn()
    await requireAuth(req, res, next)
    expect(res._status).toBe(403)
  })
})

// ── requireAdmin ─────────────────────────────────────────────────
describe('requireAdmin', () => {
  it('calls next() when role is ADMIN', () => {
    const req = { user: { ...SAMPLE_USER, role: 'ADMIN' } }
    const res = makeRes()
    const next = jest.fn()
    requireAdmin(req, res, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('returns 403 when role is CUSTOMER', () => {
    const req = { user: { ...SAMPLE_USER, role: 'CUSTOMER' } }
    const res = makeRes()
    const next = jest.fn()
    requireAdmin(req, res, next)
    expect(res._status).toBe(403)
    expect(res._body.error).toMatch(/admin/)
  })

  it('returns 403 when req.user is undefined', () => {
    const req = {}
    const res = makeRes()
    const next = jest.fn()
    requireAdmin(req, res, next)
    expect(res._status).toBe(403)
  })
})
