import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// ── Mock prisma BEFORE importing the service ────────────────────
const mockAddress = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  count: jest.fn(),
}

jest.unstable_mockModule('../../src/config/prisma.js', () => ({
  prisma: { address: mockAddress },
}))

const {
  listAddresses,
  createAddress,
  updateAddress,
  softDeleteAddress,
  softDeleteAllUserAddresses,
  resolveAddressForOrder,
  buildAddressSnapshot,
} = await import('../../src/services/addressService.js')

const USER_ID = 'user-111'
const ADDR_ID = 'addr-aaa'

const sampleAddr = {
  id: ADDR_ID,
  userId: USER_ID,
  label: 'Casa',
  street: 'Carrer de Barcelona',
  number: '12',
  floorDoor: '3r 2a',
  postalCode: '08302',
  city: 'Mataró',
  notes: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01'),
}

beforeEach(() => {
  for (const fn of Object.values(mockAddress)) fn.mockReset()
})

// ── buildAddressSnapshot ─────────────────────────────────────────
describe('buildAddressSnapshot', () => {
  it('builds a simple snapshot without optional fields', () => {
    const snap = buildAddressSnapshot({ street: 'Carrer Major', number: '5', postalCode: '08301', city: 'Mataró' })
    expect(snap).toBe('Carrer Major 5, 08301 Mataró')
  })

  it('includes floorDoor when present', () => {
    const snap = buildAddressSnapshot({ street: 'C/ Sol', number: '1', floorDoor: '2n 1a', postalCode: '08302', city: 'Mataró' })
    expect(snap).toBe('C/ Sol 1, 2n 1a, 08302 Mataró')
  })

  it('includes notes with em-dash when present', () => {
    const snap = buildAddressSnapshot({ street: 'C/ Luna', number: '3', postalCode: '08303', city: 'Mataró', notes: 'Portero 2B' })
    expect(snap).toBe('C/ Luna 3, 08303 Mataró — Portero 2B')
  })

  it('includes both floorDoor and notes', () => {
    const snap = buildAddressSnapshot({ street: 'Av. ICM', number: '10', floorDoor: '1r', postalCode: '08304', city: 'Mataró', notes: 'Ring bell' })
    expect(snap).toBe('Av. ICM 10, 1r, 08304 Mataró — Ring bell')
  })
})

// ── listAddresses ────────────────────────────────────────────────
describe('listAddresses', () => {
  it('returns the list from prisma', async () => {
    mockAddress.findMany.mockResolvedValue([sampleAddr])
    const result = await listAddresses(USER_ID)
    expect(result).toEqual([sampleAddr])
    expect(mockAddress.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: USER_ID, deletedAt: null },
    }))
  })

  it('orders by createdAt asc', async () => {
    mockAddress.findMany.mockResolvedValue([])
    await listAddresses(USER_ID)
    expect(mockAddress.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: 'asc' },
    }))
  })
})

// ── createAddress ────────────────────────────────────────────────
describe('createAddress', () => {
  const data = { street: 'Carrer Major', number: '1', postalCode: '08301', city: 'Mataró' }

  it('creates and returns the address', async () => {
    mockAddress.count.mockResolvedValue(0)
    mockAddress.create.mockResolvedValue({ ...sampleAddr, ...data })
    const result = await createAddress(USER_ID, data)
    expect(result.street).toBe('Carrer Major')
    expect(mockAddress.create).toHaveBeenCalled()
  })

  it('throws 422 when user already has 10 addresses', async () => {
    mockAddress.count.mockResolvedValue(10)
    await expect(createAddress(USER_ID, data)).rejects.toMatchObject({ status: 422 })
  })

  it('passes userId to prisma.address.create', async () => {
    mockAddress.count.mockResolvedValue(0)
    mockAddress.create.mockResolvedValue({ ...sampleAddr })
    await createAddress(USER_ID, data)
    expect(mockAddress.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: USER_ID }),
    }))
  })
})

// ── updateAddress ────────────────────────────────────────────────
describe('updateAddress', () => {
  it('updates successfully when user owns the address', async () => {
    mockAddress.findUnique.mockResolvedValue(sampleAddr)
    mockAddress.update.mockResolvedValue({ ...sampleAddr, number: '99' })
    const result = await updateAddress(USER_ID, ADDR_ID, { number: '99' })
    expect(result.number).toBe('99')
  })

  it('throws 404 when address does not exist', async () => {
    mockAddress.findUnique.mockResolvedValue(null)
    await expect(updateAddress(USER_ID, ADDR_ID, { number: '5' })).rejects.toMatchObject({ status: 404 })
  })

  it('throws 404 when address is soft-deleted', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, deletedAt: new Date() })
    await expect(updateAddress(USER_ID, ADDR_ID, { number: '5' })).rejects.toMatchObject({ status: 404 })
  })

  it('throws 404 (not 403) when address belongs to another user (IDOR prevention)', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, userId: 'other-user' })
    await expect(updateAddress(USER_ID, ADDR_ID, { number: '5' })).rejects.toMatchObject({ status: 404 })
  })

  // Zone validation (M-1 fix)
  it('throws 422 when effective city + postalCode are both out of zone', async () => {
    // existing: city=Reus, postalCode=28001 → both invalid
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, city: 'Reus', postalCode: '28001' })
    await expect(updateAddress(USER_ID, ADDR_ID, { city: 'Barcelona' })).rejects.toMatchObject({ status: 422 })
  })

  it('passes when patching only postalCode to a valid CP (Reus city, 08302 CP)', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, city: 'Reus', postalCode: '22000' })
    mockAddress.update.mockResolvedValue({ ...sampleAddr, postalCode: '08302' })
    const result = await updateAddress(USER_ID, ADDR_ID, { postalCode: '08302' })
    expect(result).toBeDefined()
  })

  it('passes when patching city to Mataró (even with invalid existing CP)', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, city: 'Reus', postalCode: '28001' })
    mockAddress.update.mockResolvedValue({ ...sampleAddr, city: 'Mataró' })
    const result = await updateAddress(USER_ID, ADDR_ID, { city: 'Mataró' })
    expect(result).toBeDefined()
  })

  it('throws 422 when patching postalCode to out-of-zone (existing city Reus)', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, city: 'Reus', postalCode: '08302' })
    await expect(updateAddress(USER_ID, ADDR_ID, { postalCode: '28001' })).rejects.toMatchObject({ status: 422 })
  })
})

// ── softDeleteAddress ────────────────────────────────────────────
describe('softDeleteAddress', () => {
  it('sets deletedAt when user owns the address', async () => {
    mockAddress.findUnique.mockResolvedValue(sampleAddr)
    mockAddress.update.mockResolvedValue({ ...sampleAddr, deletedAt: new Date() })
    await softDeleteAddress(USER_ID, ADDR_ID)
    expect(mockAddress.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    }))
  })

  it('throws 404 when address not found', async () => {
    mockAddress.findUnique.mockResolvedValue(null)
    await expect(softDeleteAddress(USER_ID, ADDR_ID)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 404 when already deleted', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, deletedAt: new Date() })
    await expect(softDeleteAddress(USER_ID, ADDR_ID)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 404 when address belongs to another user', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, userId: 'other-user' })
    await expect(softDeleteAddress(USER_ID, ADDR_ID)).rejects.toMatchObject({ status: 404 })
  })
})

// ── softDeleteAllUserAddresses ───────────────────────────────────
describe('softDeleteAllUserAddresses', () => {
  it('calls updateMany with the correct filter', async () => {
    mockAddress.updateMany.mockResolvedValue({ count: 3 })
    await softDeleteAllUserAddresses(USER_ID)
    expect(mockAddress.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: USER_ID, deletedAt: null },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    }))
  })
})

// ── resolveAddressForOrder ───────────────────────────────────────
describe('resolveAddressForOrder', () => {
  it('returns the address when user owns it', async () => {
    mockAddress.findUnique.mockResolvedValue(sampleAddr)
    const result = await resolveAddressForOrder(USER_ID, ADDR_ID)
    expect(result.id).toBe(ADDR_ID)
  })

  it('throws 400 when address not found', async () => {
    mockAddress.findUnique.mockResolvedValue(null)
    await expect(resolveAddressForOrder(USER_ID, ADDR_ID)).rejects.toMatchObject({ status: 400 })
  })

  it('throws 400 when address is soft-deleted', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, deletedAt: new Date() })
    await expect(resolveAddressForOrder(USER_ID, ADDR_ID)).rejects.toMatchObject({ status: 400 })
  })

  it('throws 400 when address belongs to another user', async () => {
    mockAddress.findUnique.mockResolvedValue({ ...sampleAddr, userId: 'other-999' })
    await expect(resolveAddressForOrder(USER_ID, ADDR_ID)).rejects.toMatchObject({ status: 400 })
  })
})
