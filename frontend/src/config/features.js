// Feature flags — read from Vite env at build time.
//
// Every flag defaults to FALSE when the variable is not defined, so a clean
// `npm run build` produces the public static site (no orders, no login,
// no backend calls). To enable them in development, add to `.env.local`:
//
//   VITE_ENABLE_ORDERS=true
//   VITE_ENABLE_AUTH=true
//   VITE_ENABLE_ONLINE_FORMS=true
//
// NOTE: orders require auth, so ORDERS is only effective when AUTH is on too.

function flag(value) {
  return value === 'true' || value === true
}

const env = import.meta.env ?? {}

export const AUTH_ENABLED = flag(env.VITE_ENABLE_AUTH)
export const ORDERS_ENABLED = AUTH_ENABLED && flag(env.VITE_ENABLE_ORDERS)
// Online reservation / job-application forms (need the backend).
export const ONLINE_FORMS_ENABLED = flag(env.VITE_ENABLE_ONLINE_FORMS)
