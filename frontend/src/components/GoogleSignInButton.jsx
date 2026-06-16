// GoogleSignInButton.jsx — Google Identity Services (GIS) sign-in button.
//
// USAGE
//   <GoogleSignInButton onSuccess={handleSuccess} onError={setServerError} />
//
// Props:
//   onSuccess(user)  — called after the backend confirms the session.
//                      The caller is responsible for navigating / updating state.
//   onError(message) — called with a human-readable error string.
//
// SECURITY:
//   - `credential` (Google ID token) is forwarded to our backend once and then
//     discarded. It is NEVER stored in JS state, sessionStorage, or localStorage.
//   - The session lives in the httpOnly cookie set by the server on POST /api/auth/google.
//   - VITE_GOOGLE_CLIENT_ID is the OAuth 2.0 public Client ID — safe to expose
//     in the browser bundle.
//   - If VITE_GOOGLE_CLIENT_ID is absent (e.g. CI build without env config),
//     the button is not rendered and no error is thrown.

import { useEffect, useRef, useState } from 'react'
import { googleLoginRequest } from '../services/authService.js'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// Script URL for Google Identity Services
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/**
 * Loads the GIS script once, lazily, and resolves when `window.google` is ready.
 * If the script is already present / loaded, resolves immediately.
 * @returns {Promise<void>}
 */
function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    // Reuse an existing <script> tag if a previous call already injected it.
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`)
    if (existing) {
      // Wait for it to finish loading (it may still be in-flight).
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * GoogleSignInButton
 *
 * Renders the official Google "Sign in with Google" button.
 * Handles the full GIS lifecycle: script loading, initialization, rendering.
 */
export default function GoogleSignInButton({ onSuccess, onError }) {
  const buttonRef = useRef(null)
  // Whether the GIS SDK has been loaded and initialized.
  const [ready, setReady] = useState(false)
  // Loading state while POST /api/auth/google is in-flight.
  const [loading, setLoading] = useState(false)

  // Abort if no Client ID configured (e.g. local dev without .env.local).
  if (!CLIENT_ID) return null

  // Stable callback ref — avoids re-initializing GIS on every render.
  const handleCredentialResponse = useRef(null)
  handleCredentialResponse.current = async (response) => {
    setLoading(true)
    try {
      // Forward the Google ID token to our backend.
      // NEVER store response.credential anywhere after this call.
      const data = await googleLoginRequest(response.credential)
      onSuccess(data)
    } catch (err) {
      onError(err.message || 'Error al iniciar sesión con Google.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    loadGisScript()
      .then(() => {
        if (cancelled) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => handleCredentialResponse.current(response),
          // Use popup flow — avoids full-page redirect which would lose SPA state.
          ux_mode: 'popup',
        })
        setReady(true)
      })
      .catch(() => {
        // GIS script failed to load (network issue, blocker, etc.)
        // Fail silently — the email/password form is always available.
        if (!cancelled) {
          onError('No se pudo cargar el inicio de sesión con Google. Usa tu correo y contraseña.')
        }
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render the official button once the SDK is initialized.
  useEffect(() => {
    if (ready && buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        width: buttonRef.current.offsetWidth || 360,
      })
    }
  }, [ready])

  return (
    <div className="google-signin-wrapper" aria-busy={loading}>
      {/* The GIS SDK replaces the inner content of this div with the button iframe. */}
      <div
        ref={buttonRef}
        className="google-signin-button-container"
        aria-label="Continuar con Google"
      />
      {loading && (
        <p className="google-signin-loading" role="status" aria-live="polite">
          Verificando…
        </p>
      )}
    </div>
  )
}
