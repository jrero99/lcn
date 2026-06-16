import { describe, it, expect, jest } from '@jest/globals'
import {
  registerLimiter,
  loginLimiter,
  orderLimiter,
  googleAuthLimiter,
  reservationLimiter,
  addressMutationLimiter,
  json429,
  makeLimiter,
} from '../../src/middleware/rateLimiter.js'

describe('rateLimiter — test mode (passthrough)', () => {
  const limiters = {
    registerLimiter,
    loginLimiter,
    orderLimiter,
    googleAuthLimiter,
    reservationLimiter,
    addressMutationLimiter,
  }

  for (const [name, limiter] of Object.entries(limiters)) {
    it(`${name} calls next() without blocking in test mode`, () => {
      const req = {}
      const res = {}
      const next = jest.fn()
      // In test mode, all limiters are passthrough
      expect(typeof limiter).toBe('function')
      limiter(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)
    })
  }
})

describe('json429', () => {
  it('returns 429 with Retry-After header and correct body', () => {
    const res = {
      _status: null,
      _headers: {},
      _body: null,
      status(code) { this._status = code; return this },
      set(name, value) { this._headers[name] = value; return this },
      json(body) { this._body = body; return this },
    }
    json429({}, res)
    expect(res._status).toBe(429)
    expect(res._headers['Retry-After']).toBe('60')
    expect(res._body.error).toBe('Too many requests. Please try again later.')
  })
})

describe('makeLimiter — production mode branch', () => {
  it('creates a real rate limiter when TEST_DISABLE_RATE_LIMIT is not set', () => {
    const origEnv = process.env.TEST_DISABLE_RATE_LIMIT
    delete process.env.TEST_DISABLE_RATE_LIMIT
    const limiter = makeLimiter({ windowMs: 60000, max: 10 })
    process.env.TEST_DISABLE_RATE_LIMIT = origEnv
    // A real rate limiter is a function (it's an Express middleware)
    expect(typeof limiter).toBe('function')
    // It should NOT be the passthrough (passthrough takes 3 args, rateLimit middleware also takes 3)
    // Just verify it's a function — the real test is via Supertest in production mode tests
    expect(limiter.name).not.toBe('passthrough') // real rateLimit has a different name
  })
})
