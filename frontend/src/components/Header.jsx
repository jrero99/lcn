import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

// Enllaços de navegació. href = ancora dins de la home (de moment);
// to = ruta real quan la pàgina existeix.
const NAV_LINKS = [
  { label: 'La Carta', href: '/#carta' },
  { label: 'Trabaja con Nosotros', href: '/#trabaja' },
  { label: 'Iniciar Sesión', href: '/#login' },
]

export default function Header() {
  return (
    <header className="site-header">
      <Link className="header-logo" to="/" aria-label="La Casa Nostra · inici">
        <Logo variant="red" />
      </Link>

      <nav className="header-nav" aria-label="Navegació principal">
        {NAV_LINKS.map((link) => (
          <a key={link.label} className="nav-link" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="header-actions">
        <Link className="btn btn-outline" to="/hacer-pedido">Hacer pedido</Link>
        <a className="btn btn-solid" href="/#reservar">Reservar</a>
      </div>
    </header>
  )
}
