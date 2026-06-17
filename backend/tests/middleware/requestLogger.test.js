import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { requestLogger } from '../../src/middleware/requestLogger.js'

describe('requestLogger middleware', () => {
  let consoleSpy

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  function makeRes(statusCode = 200) {
    const listeners = {}
    return {
      statusCode,
      on(event, cb) { listeners[event] = cb },
      emit(event) { listeners[event]?.() },
    }
  }

  it('calls next immediately', () => {
    const req = { cookies: {}, method: 'GET', path: '/health' }
    const res = makeRes()
    const next = jest.fn()
    requestLogger(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('logs when the response finishes', () => {
    const req = { cookies: {}, method: 'GET', path: '/api/catalog' }
    const res = makeRes(200)
    const next = jest.fn()
    requestLogger(req, res, next)
    res.emit('finish')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    const logLine = consoleSpy.mock.calls[0][0]
    expect(logLine).toMatch('GET')
    expect(logLine).toMatch('/api/catalog')
    expect(logLine).toMatch('200')
  })

  it('uses lcn_sid cookie if present instead of generating a random id', () => {
    const req = { cookies: { lcn_sid: 'abc12345' }, method: 'POST', path: '/api/auth/login' }
    const res = makeRes(401)
    const next = jest.fn()
    requestLogger(req, res, next)
    res.emit('finish')
    const logLine = consoleSpy.mock.calls[0][0]
    expect(logLine).toContain('sid:abc12345')
  })

  it('generates a random sid when no lcn_sid cookie', () => {
    const req = { cookies: {}, method: 'DELETE', path: '/api/users/me' }
    const res = makeRes(200)
    const next = jest.fn()
    requestLogger(req, res, next)
    res.emit('finish')
    const logLine = consoleSpy.mock.calls[0][0]
    expect(logLine).toMatch(/sid:[a-f0-9-]{6,}/)
  })
})
