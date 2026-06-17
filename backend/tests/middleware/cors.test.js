import { describe, it, expect, jest } from '@jest/globals'
import { corsMiddleware } from '../../src/middleware/cors.js'

describe('corsMiddleware', () => {
  function makeRes() {
    const headers = {}
    return {
      headers,
      _status: null,
      setHeader(name, value) { headers[name] = value },
      sendStatus(code) { this._status = code },
    }
  }

  it('sets CORS headers for an allowed origin', () => {
    const req = { headers: { origin: 'http://localhost:5173' }, method: 'GET' }
    const res = makeRes()
    const next = jest.fn()
    corsMiddleware(req, res, next)
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('true')
    expect(next).toHaveBeenCalled()
  })

  it('does NOT set CORS headers for an unknown origin', () => {
    const req = { headers: { origin: 'https://evil.com' }, method: 'GET' }
    const res = makeRes()
    const next = jest.fn()
    corsMiddleware(req, res, next)
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('responds 204 for OPTIONS preflight from allowed origin', () => {
    const req = { headers: { origin: 'http://localhost:5173' }, method: 'OPTIONS' }
    const res = makeRes()
    const next = jest.fn()
    corsMiddleware(req, res, next)
    expect(res._status).toBe(204)
    expect(next).not.toHaveBeenCalled()
  })

  it('responds 204 for OPTIONS from unknown origin (silent rejection)', () => {
    const req = { headers: { origin: 'https://attacker.io' }, method: 'OPTIONS' }
    const res = makeRes()
    const next = jest.fn()
    corsMiddleware(req, res, next)
    expect(res._status).toBe(204)
  })

  it('calls next when no origin header (e.g. same-origin or server-to-server)', () => {
    const req = { headers: {}, method: 'GET' }
    const res = makeRes()
    const next = jest.fn()
    corsMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined()
  })
})
