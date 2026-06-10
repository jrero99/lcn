import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal.jsx'

// Inline SVG icons — aria-hidden, labels carry the accessible name.
function PersonIcon() {
  return (
    <svg
      className="trabaja-field-icon"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      className="trabaja-field-icon"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V18a1 1 0 0 1-1 1C9.4 19 5 14.6 5 9a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .6 3.6 1 1 0 0 1-.25 1L6.6 10.8z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg
      className="trabaja-field-icon"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg
      className="trabaja-field-icon trabaja-textarea-icon"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// Validates an email address with a simple but robust regex.
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

const INITIAL_FORM = {
  nombre: '',
  telefono: '',
  email: '',
  mensaje: '',
  cvFile: null,
  rgpd: false,
}

export default function Trabaja() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  // Generic field change handler — clears the error for the field being edited.
  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, cvFile: file }))
    if (errors.cvFile) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.cvFile
        return next
      })
    }
  }

  function validate() {
    const next = {}
    if (!form.nombre.trim()) next.nombre = 'El nombre es obligatorio'
    if (!form.telefono.trim()) next.telefono = 'El teléfono es obligatorio'
    if (!form.email.trim()) {
      next.email = 'El email es obligatorio'
    } else if (!isValidEmail(form.email)) {
      next.email = 'Introduce un email válido'
    }
    if (!form.cvFile) next.cvFile = 'Adjunta tu CV (PDF, DOC o DOCX)'
    if (!form.rgpd) next.rgpd = 'Debes aceptar la política de privacidad para continuar'
    return next
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // TODO: POST /api/jobs when the backend exists.
    // Expected contract:
    //   Method  : POST /api/jobs
    //   Content-Type: multipart/form-data
    //   Fields  : nombre (string), telefono (string), email (string),
    //             mensaje (string, optional), cv (File — pdf/doc/docx)
    //   Response: 201 { message: string }
    //   Error   : 422 { errors: { field: string }[] }
    //
    // Example (replace the block below with the real call):
    //   const fd = new FormData()
    //   fd.append('nombre',   form.nombre)
    //   fd.append('telefono', form.telefono)
    //   fd.append('email',    form.email)
    //   fd.append('mensaje',  form.mensaje)
    //   fd.append('cv',       form.cvFile)
    //   await fetch('/api/jobs', { method: 'POST', body: fd })

    setModalOpen(true)
    setForm(INITIAL_FORM)
    // Reset the native file input so it does not retain the previous selection.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleCloseModal() {
    setModalOpen(false)
  }

  return (
    <>
      <section className="trabaja-page">
        {/* ── HERO ── */}
        <div className="trabaja-hero">
          <h1 className="trabaja-hero-title">
            ÚNETE AL EQUIPO<br />DE LA CASA NOSTRA!
          </h1>
          <p className="trabaja-hero-sub">
            Buscamos personas dinámicas, responsables y con ganas de crecer.
            Déjanos tu CV y contactaremos contigo.
          </p>
        </div>

        {/* ── FORM ── */}
        <div className="trabaja-form-wrap">
          <form
            className="trabaja-form"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Formulario de candidatura"
          >
            {/* Row 1: Nombre + Teléfono */}
            <div className="trabaja-row-two">
              {/* Nombre */}
              <div className="trabaja-field-wrap">
                <label className="sr-only" htmlFor="tj-nombre">Nombre</label>
                <div
                  className={`trabaja-field${errors.nombre ? ' trabaja-field--error' : ''}`}
                >
                  <PersonIcon />
                  <input
                    id="tj-nombre"
                    type="text"
                    placeholder="Nombre"
                    value={form.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    aria-invalid={!!errors.nombre}
                    aria-describedby={errors.nombre ? 'tj-nombre-error' : undefined}
                    autoComplete="given-name"
                  />
                </div>
                {errors.nombre && (
                  <p id="tj-nombre-error" className="field-error" role="alert">
                    {errors.nombre}
                  </p>
                )}
              </div>

              {/* Teléfono */}
              <div className="trabaja-field-wrap">
                <label className="sr-only" htmlFor="tj-telefono">Teléfono</label>
                <div
                  className={`trabaja-field${errors.telefono ? ' trabaja-field--error' : ''}`}
                >
                  <PhoneIcon />
                  <input
                    id="tj-telefono"
                    type="tel"
                    placeholder="Teléfono"
                    value={form.telefono}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                    aria-invalid={!!errors.telefono}
                    aria-describedby={errors.telefono ? 'tj-telefono-error' : undefined}
                    autoComplete="tel"
                  />
                </div>
                {errors.telefono && (
                  <p id="tj-telefono-error" className="field-error" role="alert">
                    {errors.telefono}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Email + Adjuntar CV */}
            <div className="trabaja-row-email">
              {/* Email */}
              <div className="trabaja-field-wrap trabaja-email-field-wrap">
                <label className="sr-only" htmlFor="tj-email">Email</label>
                <div
                  className={`trabaja-field${errors.email ? ' trabaja-field--error' : ''}`}
                >
                  <EmailIcon />
                  <input
                    id="tj-email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'tj-email-error' : undefined}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p id="tj-email-error" className="field-error" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* CV file picker */}
              <div className="trabaja-field-wrap trabaja-cv-field-wrap">
                {/* Hidden native file input */}
                <input
                  ref={fileInputRef}
                  id="tj-cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="trabaja-file-input"
                  onChange={handleFileChange}
                  aria-label="Adjuntar CV (PDF, DOC o DOCX)"
                  aria-describedby={errors.cvFile ? 'tj-cv-error' : undefined}
                  aria-invalid={!!errors.cvFile}
                />
                {/* Visible button that triggers the hidden input */}
                <button
                  type="button"
                  className={`btn btn-solid trabaja-cv-btn${errors.cvFile ? ' trabaja-cv-btn--error' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  aria-controls="tj-cv"
                >
                  <PlusIcon />
                  <span>Adjuntar CV</span>
                </button>
                {/* Show selected filename, or error */}
                {form.cvFile ? (
                  <p className="trabaja-cv-filename" aria-live="polite">
                    {form.cvFile.name}
                  </p>
                ) : errors.cvFile ? (
                  <p id="tj-cv-error" className="field-error" role="alert">
                    {errors.cvFile}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Row 3: Mensaje */}
            <div className="trabaja-field-wrap">
              <label className="sr-only" htmlFor="tj-mensaje">Mensaje (opcional)</label>
              <div className="trabaja-field trabaja-field--textarea">
                <MessageIcon />
                <textarea
                  id="tj-mensaje"
                  placeholder="Mensaje (opcional)"
                  rows={4}
                  value={form.mensaje}
                  onChange={(e) => handleChange('mensaje', e.target.value)}
                />
              </div>
            </div>

            {/* RGPD consent — required by CLAUDE.md §5 and legal obligation (personal
                data + CV = data processing for selection; explicit consent is
                mandatory under GDPR / LOPDGDD). */}
            <div className="trabaja-rgpd-wrap">
              <label className="trabaja-rgpd-label">
                <input
                  type="checkbox"
                  checked={form.rgpd}
                  onChange={(e) => handleChange('rgpd', e.target.checked)}
                  aria-invalid={!!errors.rgpd}
                  aria-describedby={errors.rgpd ? 'tj-rgpd-error' : undefined}
                />
                <span className="trabaja-rgpd-text">
                  He leído y acepto la{' '}
                  <Link to="/politica-privacidad" className="trabaja-rgpd-link">política de privacidad</Link>
                  {' '}y el tratamiento de mis datos para procesos de selección.
                </span>
              </label>
              {errors.rgpd && (
                <p id="tj-rgpd-error" className="field-error" role="alert">
                  {errors.rgpd}
                </p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" className="trabaja-submit-btn">
              Enviar candidatura
            </button>
          </form>
        </div>
      </section>

      {/* Confirmation modal — reuses the generic Modal component */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title="¡GRACIAS POR TU SOLICITUD!"
        message="Hemos recibido tu candidatura correctamente. Revisaremos tu información y nos pondremos en contacto contigo si tu perfil encaja con alguna de nuestras vacantes."
      >
        <p className="trabaja-modal-thanks">
          <strong>¡Gracias por tu interés en formar parte de nuestro equipo! 🍔</strong>
        </p>
      </Modal>
    </>
  )
}
