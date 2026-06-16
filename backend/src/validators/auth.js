import { z } from 'zod'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

const spanishPhone = z.string().superRefine((val, ctx) => {
  const trimmed = val.trim()
  if (!isValidPhoneNumber(trimmed, 'ES')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Phone number must be a valid Spanish number (ES)',
    })
  }
})

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  // apellidos is captured but we store it joined with name, or separately
  apellidos: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  // Password: min 8 chars — bcrypt/argon2 handle the rest
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72),
  phone: spanishPhone,
  consentConditions: z.literal(true, {
    errorMap: () => ({ message: 'Must accept terms and conditions' }),
  }),
  consentPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'Must accept privacy policy' }),
  }),
  consentMarketing: z.boolean().default(false),
  // Honeypot — must be absent or empty
  _honey: z.string().max(0).optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
})

/**
 * Google SSO endpoint — POST /api/auth/google
 * The frontend sends the ID token returned by Google Identity Services.
 * The backend verifies it with google-auth-library; never trust payload from client.
 */
export const googleAuthSchema = z.object({
  // Google ID token (JWT signed by Google). Typical length is ~1100–2000 chars.
  credential: z
    .string()
    .trim()
    .min(100, 'Invalid Google credential')
    .max(4096, 'Credential too long'),
})
