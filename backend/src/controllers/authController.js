import { registerSchema, loginSchema, googleAuthSchema } from '../validators/auth.js'
import * as authService from '../services/authService.js'
import { setAuthCookie, clearAuthCookie } from '../utils/jwt.js'

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body)
    const user = await authService.register(data)
    setAuthCookie(res, user.id)
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const user = await authService.login(email, password)
    setAuthCookie(res, user.id)
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    next(err)
  }
}

export async function logout(_req, res) {
  clearAuthCookie(res)
  res.json({ message: 'Logged out' })
}

export async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id)
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/google
 * Body: { credential: "<google_id_token>" }
 *
 * Verifies the Google ID token server-side, then find-or-creates the user.
 * Issues the same httpOnly JWT cookie as the regular login flow.
 * RGPD: the raw credential (ID token) is never logged.
 */
export async function googleAuth(req, res, next) {
  try {
    const { credential } = googleAuthSchema.parse(req.body)
    // credential is validated in schema but NEVER logged (contains PII from Google)
    const user = await authService.loginWithGoogle(credential)
    setAuthCookie(res, user.id)
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteAccount(req, res, next) {
  try {
    await authService.deleteAccount(req.user.id)
    clearAuthCookie(res)
    res.json({ message: 'Account deleted' })
  } catch (err) {
    next(err)
  }
}
