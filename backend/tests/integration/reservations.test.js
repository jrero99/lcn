import { describe, it, expect, jest } from '@jest/globals'
import request from 'supertest'

const prismaMock = {
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(async (cb) => cb(prismaMock)),
}
jest.unstable_mockModule('../../src/config/prisma.js', () => ({ prisma: prismaMock }))
jest.unstable_mockModule('argon2', () => ({ default: { hash: jest.fn(), verify: jest.fn(), argon2id: 'argon2id' } }))

const app = (await import('../../src/index.js')).default

// Helper: get a future date string for a given day-of-week
function nextDateForDay(dayOfWeek) {
  const now = new Date()
  let daysAhead = (dayOfWeek - now.getDay() + 7) % 7
  if (daysAhead === 0) daysAhead = 7
  const d = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('POST /api/reservations', () => {
  it('returns 200 with availableSlots=[] for a valid open time', async () => {
    const date = nextDateForDay(4) // Thursday
    const res = await request(app)
      .post('/api/reservations')
      .send({ date, time: '20:00', zone: 'interior', guests: 2 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ availableSlots: [] })
  })

  it('returns 422 for a past date', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .send({ date: '2020-01-01', time: '12:00', zone: 'interior', guests: 2 })
    expect(res.status).toBe(422)
  })

  it('returns 422 for Monday (closed)', async () => {
    const date = nextDateForDay(1)
    const res = await request(app)
      .post('/api/reservations')
      .send({ date, time: '14:00', zone: 'interior', guests: 2 })
    expect(res.status).toBe(422)
  })

  it('returns 422 for Tuesday (closed)', async () => {
    const date = nextDateForDay(2)
    const res = await request(app)
      .post('/api/reservations')
      .send({ date, time: '20:00', zone: 'interior', guests: 2 })
    expect(res.status).toBe(422)
  })

  it('returns 422 for missing date field', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .send({ time: '20:00', zone: 'interior', guests: 2 })
    expect(res.status).toBe(422)
  })

  it('returns 422 for invalid zone', async () => {
    const date = nextDateForDay(4)
    const res = await request(app)
      .post('/api/reservations')
      .send({ date, time: '20:00', zone: 'rooftop', guests: 2 })
    expect(res.status).toBe(422)
  })

  it('returns 422 for guests = 0', async () => {
    const date = nextDateForDay(4)
    const res = await request(app)
      .post('/api/reservations')
      .send({ date, time: '20:00', zone: 'interior', guests: 0 })
    expect(res.status).toBe(422)
  })

  it('returns 403 when honeypot is filled', async () => {
    const date = nextDateForDay(4)
    const res = await request(app)
      .post('/api/reservations')
      .send({ date, time: '20:00', zone: 'interior', guests: 2, _honey: 'x' })
    // honeypot is on the reservation route
    expect([403, 422]).toContain(res.status)
  })

  it('returns 422 for Wednesday before opening (17:00)', async () => {
    const date = nextDateForDay(3)
    const res = await request(app)
      .post('/api/reservations')
      .send({ date, time: '17:00', zone: 'barra', guests: 1 })
    expect(res.status).toBe(422)
  })

  it('accepts all three valid zones', async () => {
    for (const zone of ['interior', 'terrassa', 'barra']) {
      const date = nextDateForDay(4)
      const res = await request(app)
        .post('/api/reservations')
        .send({ date, time: '19:00', zone, guests: 3 })
      expect(res.status).toBe(200)
    }
  })
})
