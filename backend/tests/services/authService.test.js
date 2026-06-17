import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// ── Mock prisma ──────────────────────────────────────────────────
const mockUser = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}
const mockAddress = {
  updateMany: jest.fn(),
}

jest.unstable_mockModule('../../src/config/prisma.js', () => ({
  prisma: { user: mockUser, address: mockAddress },
}))

// ── Mock argon2 ──────────────────────────────────────────────────
const mockArgon2 = {
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 'argon2id',
}
jest.unstable_mockModule('argon2', () => ({ default: mockArgon2 }))

// ── Mock google-auth-library ─────────────────────────────────────
const mockGetPayload = jest.fn()
const mockVerifyIdToken = jest.fn()
jest.unstable_mockModule('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}))

const { register, login, getMe, loginWithGoogle, deleteAccount, normalizePhone } =
  await import('../../src/services/authService.js')

const SAMPLE_USER = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Joan',
  lastName: 'Garcia',
  role: 'CUSTOMER',
  passwordHash: 'valid-hash',
  deletedAt: null,
  phoneVerified: false,
}

beforeEach(() => {
  mockUser.findUnique.mockReset()
  mockUser.create.mockReset()
  mockUser.update.mockReset()
  mockAddress.updateMany.mockReset()
  mockArgon2.hash.mockReset()
  mockArgon2.verify.mockReset()
  mockVerifyIdToken.mockReset()
  mockGetPayload.mockReset()
})

// ── normalizePhone ───────────────────────────────────────────────
describe('normalizePhone', () => {
  it('normalises a valid Spanish mobile to E.164', () => {
    const result = normalizePhone('612345678')
    expect(result).toBe('+34612345678')
  })

  it('normalises with country prefix', () => {
    const result = normalizePhone('+34612345678')
    expect(result).toBe('+34612345678')
  })

  it('throws 422 for an invalid phone', () => {
    expect(() => normalizePhone('123')).toThrow(expect.objectContaining({ status: 422 }))
  })

  it('throws 422 for a completely invalid number string', () => {
    expect(() => normalizePhone('not-a-phone')).toThrow(expect.objectContaining({ status: 422 }))
  })
})

// ── register ─────────────────────────────────────────────────────
describe('register', () => {
  const validData = {
    name: 'Joan',
    apellidos: 'Garcia',
    email: 'joan@example.com',
    password: 'password123',
    phone: '612345678',
    consentConditions: true,
    consentPrivacy: true,
    consentMarketing: false,
  }

  it('creates a user with hashed password', async () => {
    mockArgon2.hash.mockResolvedValue('hashed-pw')
    mockUser.create.mockResolvedValue({
      id: 'u1',
      email: 'joan@example.com',
      firstName: 'Joan',
      lastName: 'Garcia',
      role: 'CUSTOMER',
    })
    const user = await register(validData)
    expect(user.email).toBe('joan@example.com')
    expect(mockArgon2.hash).toHaveBeenCalled()
    expect(mockUser.create).toHaveBeenCalled()
  })

  it('always sets role to CUSTOMER', async () => {
    mockArgon2.hash.mockResolvedValue('hashed-pw')
    mockUser.create.mockResolvedValue({ id: 'u1', email: 'j@e.com', firstName: 'J', lastName: 'G', role: 'CUSTOMER' })
    await register(validData)
    const createCall = mockUser.create.mock.calls[0][0]
    expect(createCall.data.role).toBe('CUSTOMER')
  })

  it('normalises the phone number before storing', async () => {
    mockArgon2.hash.mockResolvedValue('hashed-pw')
    mockUser.create.mockResolvedValue({ id: 'u1', email: 'j@e.com', firstName: 'J', lastName: 'G', role: 'CUSTOMER' })
    await register({ ...validData, phone: '612 345 678' })
    const createCall = mockUser.create.mock.calls[0][0]
    expect(createCall.data.phone).toBe('+34612345678')
  })
})

// ── login ────────────────────────────────────────────────────────
describe('login', () => {
  it('returns user info on valid credentials', async () => {
    mockUser.findUnique.mockResolvedValue(SAMPLE_USER)
    mockArgon2.verify.mockResolvedValue(true)
    const result = await login('test@example.com', 'password123')
    expect(result.id).toBe('user-1')
    expect(result.email).toBe('test@example.com')
  })

  it('throws 401 when user not found', async () => {
    mockUser.findUnique.mockResolvedValue(null)
    mockArgon2.verify.mockRejectedValue(new Error('malformed hash'))
    await expect(login('no@user.com', 'pass')).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 when password is wrong', async () => {
    mockUser.findUnique.mockResolvedValue(SAMPLE_USER)
    mockArgon2.verify.mockResolvedValue(false)
    await expect(login('test@example.com', 'wrongpass')).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 when user is soft-deleted', async () => {
    mockUser.findUnique.mockResolvedValue({ ...SAMPLE_USER, deletedAt: new Date() })
    mockArgon2.verify.mockResolvedValue(true)
    await expect(login('test@example.com', 'password123')).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 for Google-only user (no passwordHash)', async () => {
    mockUser.findUnique.mockResolvedValue({ ...SAMPLE_USER, passwordHash: null })
    mockArgon2.verify.mockRejectedValue(new Error('malformed hash'))
    await expect(login('test@example.com', 'anypass')).rejects.toMatchObject({ status: 401 })
  })

  it('throws 429 when account is locked (too many failures)', async () => {
    // Trigger 10 failures to lock the account
    mockUser.findUnique.mockResolvedValue(null)
    mockArgon2.verify.mockRejectedValue(new Error('malformed hash'))
    const lockedEmail = `locked-${Date.now()}@example.com`
    for (let i = 0; i < 10; i++) {
      try { await login(lockedEmail, 'wrong') } catch {}
    }
    await expect(login(lockedEmail, 'pass')).rejects.toMatchObject({ status: 429 })
  })

  it('resets failure counter on successful login', async () => {
    const email = `reset-${Date.now()}@example.com`
    // Cause some failures
    mockUser.findUnique.mockResolvedValue(null)
    mockArgon2.verify.mockRejectedValue(new Error('malformed hash'))
    for (let i = 0; i < 3; i++) {
      try { await login(email, 'wrong') } catch {}
    }
    // Now succeed
    mockUser.findUnique.mockResolvedValue({ ...SAMPLE_USER, email })
    mockArgon2.verify.mockResolvedValue(true)
    const result = await login(email, 'correctpass')
    expect(result.email).toBe(email)
  })
})

// ── getMe ────────────────────────────────────────────────────────
describe('getMe', () => {
  it('returns user data when found', async () => {
    mockUser.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B',
      phone: '+34612345678', phoneVerified: false, role: 'CUSTOMER',
      acceptedMarketing: false, createdAt: new Date(),
    })
    const result = await getMe('u1')
    expect(result.email).toBe('a@b.com')
  })

  it('throws 404 when user not found', async () => {
    mockUser.findUnique.mockResolvedValue(null)
    await expect(getMe('ghost-id')).rejects.toMatchObject({ status: 404 })
  })
})

// ── loginWithGoogle ───────────────────────────────────────────────
describe('loginWithGoogle', () => {
  it('throws 503 when GOOGLE_CLIENT_ID is not configured', async () => {
    // GOOGLE_CLIENT_ID is not set in our test env
    await expect(loginWithGoogle('fake-token')).rejects.toMatchObject({ status: 503 })
  })

  // To test the Google SSO flow we temporarily set GOOGLE_CLIENT_ID
  // and mock verifyIdToken to return the desired payload.
  async function withGoogleClientId(fn) {
    const orig = process.env.GOOGLE_CLIENT_ID
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    try {
      // Re-read config (it was already evaluated; we patch the mock directly)
      // The config object is cached, so we reach into the module. Instead,
      // we rely on the fact that loginWithGoogle re-reads config.googleClientId at call time.
      // We need to re-import with the env var set. Since ESM modules are cached,
      // we patch the config value directly via the imported config object.
      const { config } = await import('../../src/config/env.js')
      config.googleClientId = 'test-client-id'
      await fn()
    } finally {
      const { config } = await import('../../src/config/env.js')
      config.googleClientId = null
      if (orig) process.env.GOOGLE_CLIENT_ID = orig
      else delete process.env.GOOGLE_CLIENT_ID
    }
  }

  it('throws 401 when Google verifyIdToken throws', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid token'))
      await expect(loginWithGoogle('a'.repeat(200))).rejects.toMatchObject({ status: 401 })
    })
  })

  it('throws 403 when email_verified is false', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: false, sub: 'g1', email: 'x@g.com', name: 'X' }),
      })
      await expect(loginWithGoogle('a'.repeat(200))).rejects.toMatchObject({ status: 403 })
    })
  })

  it('returns user for returning Google user (found by googleId)', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g1', email: 'x@g.com', name: 'Joan G' }),
      })
      mockUser.findUnique
        .mockResolvedValueOnce({ id: 'u1', email: 'x@g.com', firstName: 'Joan', lastName: 'G', role: 'CUSTOMER', deletedAt: null })
      const result = await loginWithGoogle('a'.repeat(200))
      expect(result.id).toBe('u1')
    })
  })

  it('throws 403 for deleted user found by googleId', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g1', email: 'x@g.com', name: 'Joan G' }),
      })
      mockUser.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'x@g.com', firstName: 'Joan', lastName: 'G', role: 'CUSTOMER', deletedAt: new Date() })
      await expect(loginWithGoogle('a'.repeat(200))).rejects.toMatchObject({ status: 403 })
    })
  })

  it('throws 403 when admin account found by googleId', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g1', email: 'admin@lcn.com', name: 'Admin' }),
      })
      mockUser.findUnique.mockResolvedValueOnce({ id: 'a1', email: 'admin@lcn.com', firstName: 'Admin', lastName: 'LCN', role: 'ADMIN', deletedAt: null })
      await expect(loginWithGoogle('a'.repeat(200))).rejects.toMatchObject({ status: 403 })
    })
  })

  it('links Google account to existing password user (found by email)', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g-new', email: 'existing@example.com', name: 'Joan G' }),
      })
      // Not found by googleId
      mockUser.findUnique.mockResolvedValueOnce(null)
      // Found by email
      mockUser.findUnique.mockResolvedValueOnce({
        id: 'u2', email: 'existing@example.com', firstName: 'Joan', lastName: 'G',
        role: 'CUSTOMER', googleId: null, deletedAt: null,
      })
      mockUser.update.mockResolvedValueOnce({})
      const result = await loginWithGoogle('a'.repeat(200))
      expect(result.id).toBe('u2')
      expect(mockUser.update).toHaveBeenCalled()
    })
  })

  it('does not re-link if user already has a googleId', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g-other', email: 'existing2@example.com', name: 'Joan G' }),
      })
      mockUser.findUnique.mockResolvedValueOnce(null) // not by googleId
      // Found by email, already has a googleId
      mockUser.findUnique.mockResolvedValueOnce({
        id: 'u3', email: 'existing2@example.com', firstName: 'Joan', lastName: 'G',
        role: 'CUSTOMER', googleId: 'g-old', deletedAt: null,
      })
      const result = await loginWithGoogle('a'.repeat(200))
      expect(result.id).toBe('u3')
      // update should NOT be called since googleId is already set
      expect(mockUser.update).not.toHaveBeenCalled()
    })
  })

  it('throws 403 for admin found by email', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g-new2', email: 'admin2@lcn.com', name: 'Admin' }),
      })
      mockUser.findUnique.mockResolvedValueOnce(null) // not by googleId
      mockUser.findUnique.mockResolvedValueOnce({
        id: 'a2', email: 'admin2@lcn.com', firstName: 'Admin', lastName: 'LCN',
        role: 'ADMIN', googleId: null, deletedAt: null,
      })
      await expect(loginWithGoogle('a'.repeat(200))).rejects.toMatchObject({ status: 403 })
    })
  })

  it('throws 403 for deleted user found by email', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g-new3', email: 'deleted@example.com', name: 'Del' }),
      })
      mockUser.findUnique.mockResolvedValueOnce(null)
      mockUser.findUnique.mockResolvedValueOnce({
        id: 'u4', email: 'deleted@example.com', firstName: 'Del', lastName: 'U',
        role: 'CUSTOMER', googleId: null, deletedAt: new Date(),
      })
      await expect(loginWithGoogle('a'.repeat(200))).rejects.toMatchObject({ status: 403 })
    })
  })

  it('creates new user when not found by googleId or email', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g-brand-new', email: 'newuser@example.com', name: 'New User' }),
      })
      mockUser.findUnique.mockResolvedValueOnce(null) // not by googleId
      mockUser.findUnique.mockResolvedValueOnce(null) // not by email
      mockUser.create.mockResolvedValueOnce({ id: 'u-new', email: 'newuser@example.com', firstName: 'New', lastName: 'User', role: 'CUSTOMER' })
      const result = await loginWithGoogle('a'.repeat(200))
      expect(result.id).toBe('u-new')
      expect(mockUser.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ role: 'CUSTOMER', googleId: 'g-brand-new' }),
      }))
    })
  })

  it('handles user with single-word name (no space)', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g-single', email: 'single@example.com', name: 'Mononym' }),
      })
      mockUser.findUnique.mockResolvedValueOnce(null)
      mockUser.findUnique.mockResolvedValueOnce(null)
      mockUser.create.mockResolvedValueOnce({ id: 'u-single', email: 'single@example.com', firstName: 'Mononym', lastName: '', role: 'CUSTOMER' })
      await loginWithGoogle('a'.repeat(200))
      const createData = mockUser.create.mock.calls[0][0].data
      expect(createData.firstName).toBe('Mononym')
      expect(createData.lastName).toBe('')
    })
  })

  it('uses "Usuario" as firstName when name is empty', async () => {
    await withGoogleClientId(async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: true, sub: 'g-noname', email: 'noname@example.com', name: '' }),
      })
      mockUser.findUnique.mockResolvedValueOnce(null)
      mockUser.findUnique.mockResolvedValueOnce(null)
      mockUser.create.mockResolvedValueOnce({ id: 'u-nn', email: 'noname@example.com', firstName: 'Usuario', lastName: '', role: 'CUSTOMER' })
      await loginWithGoogle('a'.repeat(200))
      const createData = mockUser.create.mock.calls[0][0].data
      expect(createData.firstName).toBe('Usuario')
    })
  })
})

// ── deleteAccount ─────────────────────────────────────────────────
describe('deleteAccount', () => {
  it('soft-deletes all user addresses and anonymises user data', async () => {
    mockAddress.updateMany.mockResolvedValue({ count: 2 })
    mockUser.update.mockResolvedValue({})
    await deleteAccount('user-1')
    expect(mockAddress.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', deletedAt: null },
    }))
    expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: expect.objectContaining({ email: expect.stringContaining('deleted_') }),
    }))
  })

  it('sets deletedAt in the anonymised user record', async () => {
    mockAddress.updateMany.mockResolvedValue({ count: 0 })
    mockUser.update.mockResolvedValue({})
    await deleteAccount('user-2')
    const updateCall = mockUser.update.mock.calls[0][0]
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date)
  })
})
