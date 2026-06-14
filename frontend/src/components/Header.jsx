import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'

// Navigation links.
// - `to`   : internal SPA route → rendered as <Link> (no full-page reload).
// - `href` : home-section anchor → rendered as <a>.
const NAV_LINKS = [
  { label: 'La Carta',             to: '/carta' },
  { label: 'Trabaja con Nosotros', to: '/trabaja' },
  { label: 'Iniciar Sesión',       to: '/login' },
]

// Hamburger icon (three bars / close X) — inline SVG, no dependency.
function HamburgerIcon({ open }) {
  return open ? (
    // Close (X) icon
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ) : (
    // Hamburger (three bars) icon
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export default function Header() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const headerRef = useRef(null)

  // Keep --header-h CSS variable in sync with the actual rendered header height.
  // This lets the sticky cat-nav (top: var(--header-h)) stay correctly positioned
  // even when the mobile nav panel is open and the header grows taller.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    function syncHeight() {
      document.documentElement.style.setProperty(
        '--header-h',
        `${el.offsetHeight}px`
      )
    }

    syncHeight()

    // Use ResizeObserver to catch any height change (nav open/close, font load, etc.)
    const ro = new ResizeObserver(syncHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Close nav on route change (user tapped a link)
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname, location.search])

  // Close nav when pressing Escape
  useEffect(() => {
    if (!navOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navOpen])

  function toggleNav() {
    setNavOpen((prev) => !prev)
  }

  return (
    <header
      ref={headerRef}
      className={`site-header${navOpen ? ' header--nav-open' : ''}`}
    >
      <Link className="header-logo" to="/" aria-label="La Casa Nostra · inici">
        <Logo variant="red" />
      </Link>

      {/* Desktop navigation — always visible; hidden on mobile via CSS */}
      <nav
        id="main-nav"
        className={`header-nav${navOpen ? ' header-nav--open' : ''}`}
        aria-label="Navegació principal"
      >
        {NAV_LINKS.map((link) =>
          link.to ? (
            // Internal SPA route: use <Link> to avoid full-page reload.
            <Link key={link.label} className="nav-link" to={link.to}>
              {link.label}
            </Link>
          ) : (
            // Home-section anchor or external URL: plain <a>.
            <a key={link.label} className="nav-link" href={link.href}>
              {link.label}
            </a>
          )
        )}
      </nav>

      <div className="header-actions">
        <Link className="btn btn-outline" to="/hacer-pedido">Hacer pedido</Link>
        <Link className="btn btn-solid" to="/reservar">Reservar</Link>
      </div>

      {/* Hamburger toggle — visible only on mobile/tablet via CSS */}
      <button
        className="header-hamburger"
        type="button"
        aria-controls="main-nav"
        aria-expanded={navOpen}
        aria-label={navOpen ? 'Tancar menú' : 'Obrir menú'}
        onClick={toggleNav}
      >
        <HamburgerIcon open={navOpen} />
      </button>
    </header>
  )
}
