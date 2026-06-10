import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { BUSINESS } from '../data/business.js'

const HOURS = [
  { day: 'Miércoles a jueves', time: '18:00 – 23:30' },
  { day: 'Viernes', time: '18:00 – 00:00' },
  { day: 'Sábado', time: '11:00 – 16:00 / 19:00 – 00:00' },
  { day: 'Domingo', time: '11:00 – 16:00' },
]

// Pages column links.
// - Internal SPA routes use <Link to="...">.
// - Home-section anchors use <a href="/#..."> (full URL so they work from any page).
// - Pages not yet built stay as href="#" with a TODO comment.
const PAGE_LINKS = [
  { label: 'Hacer pedido',        type: 'link',   to: '/hacer-pedido' },
  { label: 'Reservar',            type: 'link',   to: '/reservar' },
  { label: 'La Carta',            type: 'anchor', href: '/#carta' },
  { label: 'Trabaja con Nosotros',type: 'link',   to: '/trabaja' },
  { label: 'Política de Privacidad', type: 'link', to: '/politica-privacidad' },
  { label: 'Aviso Legal',         type: 'link',   to: '/aviso-legal' },
  { label: 'Política de Cookies', type: 'link',   to: '/politica-cookies' },
  { label: 'Condiciones de venta',type: 'link',   to: '/condiciones-venta' },
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-cols">
        <div className="footer-brand">
          <Logo variant="cream" />
          <h4>Contáctanos</h4>
          <p>+ 614 52 25 81</p>
          <p><a className="footer-email" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
          <p>Ronda de Sant Oleguer, 31, Bajos 1,<br />08304 Mataró, Barcelona</p>
          <p className="footer-copy">La Casa Nostra 2026 © - Copyright</p>
        </div>

        <div className="footer-col">
          <h4>Horarios</h4>
          <ul className="footer-hours">
            {HOURS.map((h) => (
              <li key={h.day}>
                <strong>{h.day}</strong>
                <span>{h.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Páginas</h4>
          <ul className="footer-links">
            {PAGE_LINKS.map((p) => (
              <li key={p.label}>
                {p.type === 'link' && (
                  <Link to={p.to}>{p.label}</Link>
                )}
                {p.type === 'anchor' && (
                  <a href={p.href}>{p.label}</a>
                )}
                {p.type === 'pending' && (
                  // TODO: link to real page once built
                  <a href="#">{p.label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-wordmark" aria-hidden>LA CASA NOSTRA</div>
    </footer>
  )
}
