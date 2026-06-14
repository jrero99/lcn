import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

/**
 * Signs a JWT containing only a minimal payload (sub = userId).
 * Role is always re-fetched from DB in requireAuth — never trusted from token.
 */
export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })
}

/**
 * Sets the JWT as an httpOnly, SameSite=Lax cookie.
 * In production, also sets Secure flag.
 */
export function setAuthCookie(res, userId) {
  const token = signToken(userId)
  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

  res.cookie('lcn_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge,
    path: '/',
  })
}

export function clearAuthCookie(res) {
  res.clearCookie('lcn_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
  })
}
