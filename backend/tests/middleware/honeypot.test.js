import { describe, it, expect, jest } from '@jest/globals'
import { honeypot } from '../../src/middleware/honeypot.js'

describe('honeypot middleware', () => {
  function makeRes() {
    return {
      _status: null,
      _body: null,
      status(code) { this._status = code; return this },
      json(body) { this._body = body; return this },
    }
  }

  it('calls next() when _honey is absent', () => {
    const req = { body: { name: 'Juan' } }
    const res = makeRes()
    const next = jest.fn()
    honeypot(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res._status).toBeNull()
  })

  it('calls next() when _honey is an empty string', () => {
    const req = { body: { _honey: '' } }
    const res = makeRes()
    const next = jest.fn()
    honeypot(req, res, next)
    // empty string is falsy → passes
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('returns 403 when _honey is filled', () => {
    const req = { body: { _honey: 'bot-filled' } }
    const res = makeRes()
    const next = jest.fn()
    honeypot(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(res._body.error).toBe('Forbidden')
  })

  it('calls next() when body is null/undefined', () => {
    const req = { body: null }
    const res = makeRes()
    const next = jest.fn()
    honeypot(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('calls next() when body is undefined', () => {
    const req = {}
    const res = makeRes()
    const next = jest.fn()
    honeypot(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
