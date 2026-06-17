import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import request from 'supertest'

const mockCategory = { findMany: jest.fn() }
const prismaMock = {
  category: mockCategory,
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(async (cb) => cb(prismaMock)),
}
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ prisma: prismaMock }))
jest.unstable_mockModule('argon2', () => ({ default: { hash: jest.fn(), verify: jest.fn(), argon2id: 'argon2id' } }))

const app = (await import('../../src/index.js')).default

const sampleCategory = {
  id: 'cat-1',
  slug: 'bocadillos',
  label: 'Bocadillos',
  heading: 'Los mejores',
  sortOrder: 1,
  products: [
    {
      id: 'prod-1',
      name: 'Bocadillo de jamón',
      description: 'Con jamón',
      price: 5.5,
      available: true,
      sortOrder: 1,
      productAllergens: [{ allergen: { name: 'Gluten', icon: '🌾' } }],
      ingredients: [{ name: 'Jamón', sortOrder: 1 }],
      optionGroups: [],
    },
  ],
}

beforeEach(() => {
  mockCategory.findMany.mockReset()
})

describe('GET /api/catalog', () => {
  it('returns 200 with a list of categories', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const res = await request(app).get('/api/catalog')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
  })

  it('returns the correct category shape', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const res = await request(app).get('/api/catalog')
    const cat = res.body[0]
    expect(cat.slug).toBe('bocadillos')
    expect(cat.label).toBe('Bocadillos')
    expect(cat.products).toHaveLength(1)
  })

  it('returns the correct product shape', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const res = await request(app).get('/api/catalog')
    const prod = res.body[0].products[0]
    expect(prod.name).toBe('Bocadillo de jamón')
    expect(typeof prod.price).toBe('number')
    expect(prod.allergens).toEqual(['Gluten'])
    expect(prod.ingredients).toEqual(['Jamón'])
  })

  it('returns 500 when the DB throws', async () => {
    mockCategory.findMany.mockRejectedValue(new Error('DB down'))
    const res = await request(app).get('/api/catalog')
    expect(res.status).toBe(500)
  })

  it('returns an empty array when no categories', async () => {
    mockCategory.findMany.mockResolvedValue([])
    const res = await request(app).get('/api/catalog')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
