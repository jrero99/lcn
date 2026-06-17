// sessionEvents.test.js — unit tests for the pub/sub session event module.
import { onUnauthorized, notifyUnauthorized } from '../../services/sessionEvents.js'

describe('sessionEvents', () => {
  beforeEach(() => {
    // Clear any registered handler between tests by calling cleanup
    // from a previous registration (or just register a no-op to flush state).
    const cleanup = onUnauthorized(null)
    cleanup()
  })

  test('notifyUnauthorized is a no-op when no handler is registered', () => {
    expect(() => notifyUnauthorized()).not.toThrow()
  })

  test('notifyUnauthorized calls the registered handler', () => {
    const handler = vi.fn()
    onUnauthorized(handler)
    notifyUnauthorized()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('onUnauthorized returns a cleanup function that removes the handler', () => {
    const handler = vi.fn()
    const cleanup = onUnauthorized(handler)
    cleanup()
    notifyUnauthorized()
    expect(handler).not.toHaveBeenCalled()
  })

  test('registering a new handler replaces the old one', () => {
    const first = vi.fn()
    const second = vi.fn()
    onUnauthorized(first)
    onUnauthorized(second)
    notifyUnauthorized()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  test('cleanup from first registration does not clear second handler', () => {
    const first = vi.fn()
    const second = vi.fn()
    const cleanupFirst = onUnauthorized(first)
    onUnauthorized(second)
    cleanupFirst() // first was already replaced by second → cleanup is a no-op
    notifyUnauthorized()
    expect(second).toHaveBeenCalledTimes(1)
  })

  test('handler can be null without throwing', () => {
    onUnauthorized(null)
    expect(() => notifyUnauthorized()).not.toThrow()
  })
})
