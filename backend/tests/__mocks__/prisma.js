// Manual mock of the Prisma client.
// All model methods return jest.fn() so individual tests can override with mockResolvedValue / mockRejectedValue.
// The $transaction helper executes the callback with the same mock client (tx === prismaMock).

import { jest } from '@jest/globals'

function makeModelMock() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  }
}

export const prismaMock = {
  user: makeModelMock(),
  address: makeModelMock(),
  order: makeModelMock(),
  orderLine: makeModelMock(),
  orderStatusHistory: makeModelMock(),
  product: makeModelMock(),
  category: makeModelMock(),
  allergen: makeModelMock(),
  optionChoice: makeModelMock(),
  blacklist: makeModelMock(),
  // $transaction: executes the callback immediately with this same mock as `tx`
  $transaction: jest.fn(async (cb) => {
    if (typeof cb === 'function') return cb(prismaMock)
    // array form (not used in this codebase)
    return Promise.all(cb)
  }),
}

// Reset all mocks between tests
export function resetPrismaMocks() {
  const models = ['user', 'address', 'order', 'orderLine', 'orderStatusHistory', 'product', 'category', 'allergen', 'optionChoice', 'blacklist']
  for (const model of models) {
    for (const method of Object.keys(prismaMock[model])) {
      prismaMock[model][method].mockReset()
    }
  }
  prismaMock.$transaction.mockReset()
  // Restore default $transaction implementation after reset
  prismaMock.$transaction.mockImplementation(async (cb) => {
    if (typeof cb === 'function') return cb(prismaMock)
    return Promise.all(cb)
  })
}
