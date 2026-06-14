/**
 * Honeypot middleware.
 * Rejects requests where the hidden honeypot field is filled.
 * The front-end form must include a visually hidden input named "_honey"
 * that legitimate users will never fill.
 */
export function honeypot(req, res, next) {
  if (req.body && req.body._honey) {
    // Silent 403 — don't reveal why we're blocking
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}
