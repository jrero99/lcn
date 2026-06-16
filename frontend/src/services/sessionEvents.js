// sessionEvents.js — lightweight pub/sub for session-level events.
//
// PURPOSE: allow service-layer modules (addressService, adminService, …) to
// signal that a 401 response was received from a protected endpoint WITHOUT
// importing React or the AuthContext directly (which would create a circular
// dependency: Context → service → Context).
//
// DESIGN:
//   - Plain JS module with a single callback slot (one consumer: AuthContext).
//   - Services call `notifyUnauthorized()` when they see a 401.
//   - AuthContext registers a handler via `onUnauthorized()` that clears user
//     state. React re-renders naturally; no manual DOM manipulation.
//   - The handler can be unregistered by calling the returned cleanup function
//     (mirrors the useEffect cleanup pattern).
//
// SECURITY: this module carries no sensitive data. It is a signal only.

let _handler = null

/**
 * Register a callback to be invoked when any authenticated API call returns 401.
 * Replaces any previously registered handler (only one consumer expected).
 *
 * @param {() => void} handler
 * @returns {() => void}  cleanup function — call it in useEffect cleanup.
 */
export function onUnauthorized(handler) {
  _handler = handler
  return () => {
    // Only clear if our handler is still the registered one
    if (_handler === handler) _handler = null
  }
}

/**
 * Fire the unauthorized signal.
 * Called by services when a protected API returns HTTP 401.
 * Safe to call even if no handler is registered (no-op).
 */
export function notifyUnauthorized() {
  if (typeof _handler === 'function') _handler()
}
