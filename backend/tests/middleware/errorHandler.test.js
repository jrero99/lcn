import { describe, it, expect, jest } from '@jest/globals'
import { errorHandler } from '../../src/middleware/errorHandler.js'

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this },
    json(body) { this._body = body; return this },
  }
  return res
}

describe('errorHandler', () => {
  const req = {}
  const next = jest.fn()

  it('handles ZodError with 422 and issues array', () => {
    const zodErr = {
      name: 'ZodError',
      issues: [{ path: ['email'], message: 'Invalid email' }],
    }
    const res = makeRes()
    errorHandler(zodErr, req, res, next)
    expect(res._status).toBe(422)
    expect(res._body.error).toBe('Validation error')
    expect(res._body.issues[0].field).toBe('email')
    expect(res._body.issues[0].message).toBe('Invalid email')
  })

  it('handles Prisma P2002 unique constraint with 409', () => {
    const err = { code: 'P2002' }
    const res = makeRes()
    errorHandler(err, req, res, next)
    expect(res._status).toBe(409)
    expect(res._body.error).toBe('Resource already exists')
  })

  it('handles JsonWebTokenError with 401', () => {
    const err = new Error('invalid signature')
    err.name = 'JsonWebTokenError'
    const res = makeRes()
    errorHandler(err, req, res, next)
    expect(res._status).toBe(401)
    expect(res._body.error).toBe('Invalid or expired token')
  })

  it('handles TokenExpiredError with 401', () => {
    const err = new Error('jwt expired')
    err.name = 'TokenExpiredError'
    const res = makeRes()
    errorHandler(err, req, res, next)
    expect(res._status).toBe(401)
    expect(res._body.error).toBe('Invalid or expired token')
  })

  it('handles operational errors with their own status', () => {
    const err = new Error('Not found')
    err.status = 404
    const res = makeRes()
    errorHandler(err, req, res, next)
    expect(res._status).toBe(404)
    expect(res._body.error).toBe('Not found')
  })

  it('handles 422 operational error', () => {
    const err = new Error('Delivery zone invalid')
    err.status = 422
    const res = makeRes()
    errorHandler(err, req, res, next)
    expect(res._status).toBe(422)
    expect(res._body.error).toBe('Delivery zone invalid')
  })

  it('returns 500 for unknown errors in test/dev mode with detail', () => {
    const err = new Error('Something exploded')
    const res = makeRes()
    // NODE_ENV=test → !config.isProd → includes detail
    errorHandler(err, req, res, next)
    expect(res._status).toBe(500)
    expect(res._body.error).toBe('Internal server error')
    expect(res._body.detail).toBe('Something exploded')
  })

  it('handles ZodError with nested path correctly', () => {
    const zodErr = {
      name: 'ZodError',
      issues: [{ path: ['items', '0', 'productId'], message: 'Required' }],
    }
    const res = makeRes()
    errorHandler(zodErr, req, res, next)
    expect(res._body.issues[0].field).toBe('items.0.productId')
  })
})
