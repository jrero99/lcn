// Test setup file — imported before every test suite.
// Extends Vitest's expect with jest-dom matchers (toBeInTheDocument, etc.)
import '@testing-library/jest-dom'

// Stub ResizeObserver (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Stub crypto.randomUUID (available in Node >= 14.17 but may not be wired up in jsdom)
if (!global.crypto) {
  global.crypto = {}
}
if (!global.crypto.randomUUID) {
  let counter = 0
  global.crypto.randomUUID = () => `test-uuid-${++counter}`
}

// Stub window.scrollTo (jsdom doesn't implement it)
window.scrollTo = vi.fn()

// Stub Element.scrollIntoView (jsdom doesn't implement it)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

// Default fetch mock — individual tests override as needed.
// Prevents real network requests in every test.
global.fetch = vi.fn()

// Clean up mocks after each test
afterEach(() => {
  vi.restoreAllMocks()
  // Reset fetch mock to a clean state (not restored, just reset)
  if (global.fetch?.mockReset) {
    global.fetch.mockReset()
  }
})
