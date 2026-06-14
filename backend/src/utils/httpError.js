/**
 * Creates an operational HTTP error with a status code.
 * These are caught by errorHandler and returned as { error: message }.
 */
export function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}
