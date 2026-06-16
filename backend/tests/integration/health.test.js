import { describe, it, expect, jest } from '@jest/globals'
import request from 'supertest'

// Mock prisma so the app boots without a real DB
const prismaMock = {
  user: { findUnique: jest.fn() },
  address: { findMany: jest.fn() },
  order: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  product: { findUnique: jest.fn() },
  category: { findMany: jest.fn() },
  blacklist: { findFirst: jest.fn() },
  orderStatusHistory: { create: jest.fn() },
  optionChoice: { findMany: jest.fn() },
  $transaction: jest.fn(async (cb) => cb(prismaMock)),
}
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ prisma: prismaMock }))
jest.unstable_mockModule('argon2', () => ({ default: { hash: jest.fn(), verify: jest.fn(), argon2id: 'argon2id' } }))

const app = (await import('../../src/index.js')).default

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown-endpoint-xyz')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})
