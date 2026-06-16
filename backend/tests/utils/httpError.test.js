import { describe, it, expect } from '@jest/globals'
import { httpError } from '../../src/utils/httpError.js'

describe('httpError', () => {
  it('creates an Error with the given message', () => {
    const err = httpError(404, 'Not found')
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Not found')
  })

  it('attaches the status code to the error', () => {
    const err = httpError(422, 'Validation failed')
    expect(err.status).toBe(422)
  })

  it('works for any 4xx/5xx code', () => {
    expect(httpError(400, 'Bad request').status).toBe(400)
    expect(httpError(401, 'Unauthorized').status).toBe(401)
    expect(httpError(403, 'Forbidden').status).toBe(403)
    expect(httpError(500, 'Server error').status).toBe(500)
  })

  it('preserves the error message verbatim', () => {
    const msg = 'Delivery is only available in Mataró (postal codes 08301–08304)'
    expect(httpError(422, msg).message).toBe(msg)
  })
})
