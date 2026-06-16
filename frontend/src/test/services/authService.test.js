// authService.test.js — unit tests for the auth service layer.
// Mocks global fetch so no real network requests are made.
import {
  loginRequest,
  registerRequest,
  logoutRequest,
  getMeRequest,
  googleLoginRequest,
} from '../../services/authService.js'

// Helper: build a resolved fetch response
function makeResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: `Status ${status}`,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  global.fetch = vi.fn()
})

// ── loginRequest ──────────────────────────────────────────────────────────────

describe('loginRequest', () => {
  test('resolves with user data on 200', async () => {
    const user = { id: '1', email: 'a@b.com', name: 'Test', role: 'CUSTOMER' }
    global.fetch.mockReturnValue(makeResponse(200, { user }))

    const result = await loginRequest({ email: 'a@b.com', password: 'secret' })
    expect(result).toEqual({ user })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
  })

  test('throws with server message on 401', async () => {
    global.fetch.mockReturnValue(makeResponse(401, { message: 'Credenciales incorrectas' }))
    await expect(loginRequest({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toThrow('Credenciales incorrectas')
  })

  test('throws with error field on non-ok response', async () => {
    global.fetch.mockReturnValue(makeResponse(500, { error: 'Internal error' }))
    await expect(loginRequest({ email: 'a@b.com', password: 'x' }))
      .rejects.toThrow('Internal error')
  })

  test('throws with default message when server body is not parseable', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: () => Promise.reject(new Error('invalid json')),
    }))
    await expect(loginRequest({ email: 'a@b.com', password: 'x' }))
      .rejects.toThrow('Login failed: 503')
  })
})

// ── registerRequest ───────────────────────────────────────────────────────────

describe('registerRequest', () => {
  const validData = {
    name: 'Test', apellidos: 'User', email: 't@e.st', password: 'pass1234',
    phone: '+34612345678', consentConditions: true, consentPrivacy: true,
  }

  test('resolves with user on 201', async () => {
    const user = { id: '2', email: 't@e.st', name: 'Test' }
    global.fetch.mockReturnValue(makeResponse(201, { user }))
    const result = await registerRequest(validData)
    expect(result).toEqual({ user })
  })

  test('throws Spanish message on 409 (duplicate email)', async () => {
    global.fetch.mockReturnValue(makeResponse(409, {}))
    await expect(registerRequest(validData))
      .rejects.toThrow('Ya existe una cuenta con ese correo electrónico.')
  })

  test('throws Spanish message on 422 (invalid data)', async () => {
    global.fetch.mockReturnValue(makeResponse(422, {}))
    await expect(registerRequest(validData))
      .rejects.toThrow('Revisa los datos introducidos')
  })

  test('throws Spanish message on 429 (rate limit)', async () => {
    global.fetch.mockReturnValue(makeResponse(429, {}))
    await expect(registerRequest(validData))
      .rejects.toThrow('Demasiados intentos')
  })

  test('throws server message on unknown status', async () => {
    global.fetch.mockReturnValue(makeResponse(500, { message: 'Server down' }))
    await expect(registerRequest(validData))
      .rejects.toThrow('Server down')
  })

  test('throws default message when server body is empty', async () => {
    global.fetch.mockReturnValue(makeResponse(500, {}))
    await expect(registerRequest(validData))
      .rejects.toThrow('No se ha podido crear la cuenta (500).')
  })
})

// ── logoutRequest ─────────────────────────────────────────────────────────────

describe('logoutRequest', () => {
  test('calls POST /api/auth/logout with credentials', async () => {
    global.fetch.mockReturnValue(makeResponse(200, {}))
    await expect(logoutRequest()).resolves.toBeUndefined()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
  })

  test('does not throw on server error (logout is best-effort)', async () => {
    global.fetch.mockReturnValue(makeResponse(500, {}))
    await expect(logoutRequest()).resolves.toBeUndefined()
  })
})

// ── getMeRequest ──────────────────────────────────────────────────────────────

describe('getMeRequest', () => {
  test('returns user object on 200', async () => {
    const user = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'CUSTOMER' }
    global.fetch.mockReturnValue(makeResponse(200, { user }))
    const result = await getMeRequest()
    expect(result).toEqual({ user })
  })

  test('returns null on 401 (not authenticated — normal case)', async () => {
    global.fetch.mockReturnValue(makeResponse(401, {}))
    const result = await getMeRequest()
    expect(result).toBeNull()
  })

  test('throws on non-401 error', async () => {
    global.fetch.mockReturnValue(makeResponse(500, {}))
    await expect(getMeRequest()).rejects.toThrow('GET /api/auth/me failed: 500')
  })
})

// ── googleLoginRequest ────────────────────────────────────────────────────────

describe('googleLoginRequest', () => {
  test('resolves with user on 200', async () => {
    const user = { id: '3', email: 'g@google.com', name: 'G', role: 'CUSTOMER' }
    global.fetch.mockReturnValue(makeResponse(200, { user }))
    const result = await googleLoginRequest('id-token-abc')
    expect(result).toEqual({ user })
  })

  test('throws server-provided message when present', async () => {
    global.fetch.mockReturnValue(makeResponse(401, { message: 'Token inválido' }))
    await expect(googleLoginRequest('bad-token')).rejects.toThrow('Token inválido')
  })

  test('throws default message on 401 without server body', async () => {
    global.fetch.mockReturnValue(makeResponse(401, {}))
    await expect(googleLoginRequest('x')).rejects.toThrow(
      'No se ha podido verificar tu cuenta de Google'
    )
  })

  test('throws default message on 403', async () => {
    global.fetch.mockReturnValue(makeResponse(403, {}))
    await expect(googleLoginRequest('x')).rejects.toThrow('no está verificada')
  })

  test('throws default message on 422', async () => {
    global.fetch.mockReturnValue(makeResponse(422, {}))
    await expect(googleLoginRequest('x')).rejects.toThrow('no válidos')
  })

  test('throws default message on 429', async () => {
    global.fetch.mockReturnValue(makeResponse(429, {}))
    await expect(googleLoginRequest('x')).rejects.toThrow('Demasiados intentos')
  })

  test('throws default message on 503', async () => {
    global.fetch.mockReturnValue(makeResponse(503, {}))
    await expect(googleLoginRequest('x')).rejects.toThrow('no está disponible')
  })

  test('throws generic message on unknown status', async () => {
    global.fetch.mockReturnValue(makeResponse(418, {}))
    await expect(googleLoginRequest('x')).rejects.toThrow('Error al iniciar sesión con Google (418)')
  })
})
