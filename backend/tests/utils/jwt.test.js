import { describe, it, expect } from '@jest/globals'
import jwt from 'jsonwebtoken'
import { signToken, setAuthCookie, clearAuthCookie } from '../../src/utils/jwt.js'

// Build a minimal res mock for cookie methods
function makeResMock() {
  const cookies = {}
  const cleared = {}
  return {
    cookies,
    cleared,
    cookie(name, value, opts) {
      cookies[name] = { value, opts }
    },
    clearCookie(name, opts) {
      cleared[name] = { opts }
    },
  }
}

describe('signToken', () => {
  it('returns a JWT string', () => {
    const token = signToken('user-123')
    expect(typeof token).toBe('string')
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
  })

  it('encodes the userId in the sub claim', () => {
    const token = signToken('user-abc')
    const decoded = jwt.decode(token)
    expect(decoded.sub).toBe('user-abc')
  })
})

describe('setAuthCookie', () => {
  it('sets the lcn_token cookie with httpOnly flag', () => {
    const res = makeResMock()
    setAuthCookie(res, 'user-1')
    expect(res.cookies['lcn_token']).toBeDefined()
    expect(res.cookies['lcn_token'].opts.httpOnly).toBe(true)
  })

  it('sets sameSite=lax', () => {
    const res = makeResMock()
    setAuthCookie(res, 'user-1')
    expect(res.cookies['lcn_token'].opts.sameSite).toBe('lax')
  })

  it('sets a positive maxAge (7 days in ms)', () => {
    const res = makeResMock()
    setAuthCookie(res, 'user-1')
    const maxAge = res.cookies['lcn_token'].opts.maxAge
    expect(maxAge).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('embeds a valid JWT in the cookie value', () => {
    const res = makeResMock()
    setAuthCookie(res, 'user-xyz')
    const { value } = res.cookies['lcn_token']
    const decoded = jwt.decode(value)
    expect(decoded.sub).toBe('user-xyz')
  })
})

describe('clearAuthCookie', () => {
  it('clears the lcn_token cookie', () => {
    const res = makeResMock()
    clearAuthCookie(res)
    expect(res.cleared['lcn_token']).toBeDefined()
  })

  it('uses the same options (httpOnly, sameSite, path) as setAuthCookie', () => {
    const res = makeResMock()
    clearAuthCookie(res)
    const opts = res.cleared['lcn_token'].opts
    expect(opts.httpOnly).toBe(true)
    expect(opts.sameSite).toBe('lax')
    expect(opts.path).toBe('/')
  })
})
