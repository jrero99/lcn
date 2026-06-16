// ============================================================
// Environment configuration — validated at startup.
// The app throws at boot if required vars are missing.
// ============================================================

const required = (key) => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),

  // Google SSO — optional in dev (endpoint will return 503 if not set).
  // Required in production. Set to your OAuth 2.0 Web Client ID from Google Cloud Console.
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
}
