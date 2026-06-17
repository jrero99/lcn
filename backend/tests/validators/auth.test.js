import { describe, it, expect } from '@jest/globals'
import { registerSchema, loginSchema, googleAuthSchema } from '../../src/validators/auth.js'

describe('registerSchema', () => {
  const valid = {
    name: 'Joan',
    apellidos: 'Garcia',
    email: 'joan@example.com',
    password: 'securePass1',
    phone: '612345678',
    consentConditions: true,
    consentPrivacy: true,
    consentMarketing: false,
  }

  it('accepts a valid payload', () => {
    expect(() => registerSchema.parse(valid)).not.toThrow()
  })

  it('rejects missing name', () => {
    const { name, ...rest } = valid
    expect(() => registerSchema.parse(rest)).toThrow()
  })

  it('rejects password shorter than 8 characters', () => {
    expect(() => registerSchema.parse({ ...valid, password: 'short' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => registerSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects invalid Spanish phone', () => {
    expect(() => registerSchema.parse({ ...valid, phone: '123' })).toThrow()
  })

  it('rejects consentConditions = false', () => {
    expect(() => registerSchema.parse({ ...valid, consentConditions: false })).toThrow()
  })

  it('rejects consentPrivacy = false', () => {
    expect(() => registerSchema.parse({ ...valid, consentPrivacy: false })).toThrow()
  })

  it('defaults consentMarketing to false when omitted', () => {
    const { consentMarketing, ...rest } = valid
    const parsed = registerSchema.parse(rest)
    expect(parsed.consentMarketing).toBe(false)
  })

  it('blocks honeypot field when filled', () => {
    expect(() => registerSchema.parse({ ...valid, _honey: 'filled-by-bot' })).toThrow()
  })

  it('accepts honeypot field when empty string', () => {
    expect(() => registerSchema.parse({ ...valid, _honey: '' })).not.toThrow()
  })

  it('normalises email to lowercase', () => {
    const parsed = registerSchema.parse({ ...valid, email: 'Joan@Example.COM' })
    expect(parsed.email).toBe('joan@example.com')
  })
})

describe('loginSchema', () => {
  it('accepts valid email + password', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: 'anything' })).not.toThrow()
  })

  it('rejects missing password', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com' })).toThrow()
  })

  it('rejects empty password', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: '' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => loginSchema.parse({ email: 'bad', password: 'pass' })).toThrow()
  })
})

describe('googleAuthSchema', () => {
  const longToken = 'a'.repeat(200)

  it('accepts a long enough credential string', () => {
    expect(() => googleAuthSchema.parse({ credential: longToken })).not.toThrow()
  })

  it('rejects credential shorter than 100 chars', () => {
    expect(() => googleAuthSchema.parse({ credential: 'short' })).toThrow()
  })

  it('rejects credential longer than 4096 chars', () => {
    expect(() => googleAuthSchema.parse({ credential: 'a'.repeat(4097) })).toThrow()
  })

  it('rejects missing credential', () => {
    expect(() => googleAuthSchema.parse({})).toThrow()
  })
})
