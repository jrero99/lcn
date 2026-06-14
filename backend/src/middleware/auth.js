import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { prisma } from '../config/prisma.js'

/**
 * requireAuth — verifies the httpOnly JWT cookie.
 * Attaches the full DB user to req.user.
 * Responds 401 if missing/invalid token, 403 if user deleted.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.lcn_token
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const payload = jwt.verify(token, config.jwtSecret)

    // Fetch fresh user from DB — do NOT rely solely on token payload for role
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneVerified: true,
        deletedAt: true,
      },
    })

    if (!user || user.deletedAt) {
      return res.status(403).json({ error: 'Account not found or deleted' })
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * requireAdmin — must be used AFTER requireAuth.
 * Verifies role from DB (never from client input).
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: admin access required' })
  }
  next()
}
