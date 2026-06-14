import { randomUUID } from 'crypto'

/**
 * Request logger — RGPD compliant.
 * Logs ONLY: timestamp | method | path | status | anonymous session id.
 * Never logs: body content, emails, phones, addresses, passwords.
 */
export function requestLogger(req, res, next) {
  const sessionId = req.cookies?.lcn_sid ?? randomUUID().slice(0, 8)
  const start = Date.now()

  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(
      `${new Date().toISOString()} | ${req.method} ${req.path} | ${res.statusCode} | ${ms}ms | sid:${sessionId}`
    )
  })

  next()
}
