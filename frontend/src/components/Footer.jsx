import Logo from './Logo.jsx'

const HOURS = [
  { day: 'Miércoles a jueves', time: '18:00 – 23:30' },
  { day: 'Viernes', time: '18:00 – 00:00' },
  { day: 'Sábado', time: '11:00 – 16:00 / 19:00 – 00:00' },
  { day: 'Domingo', time: '11:00 – 16:00' },
]

const PAGES = [
  'Hacer pedido',
  'Reservar',
  'La Carta',
  'Trabaja con Nosotros',
  'Política de Privacidad',
  'Aviso Legal',
  'Política de Cookies',
  'Condiciones de venta',
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-cols">
        <div className="footer-brand">
          <Logo variant="cream" />
          <h4>Contáctanos</h4>
          <p>+ 614 52 25 81</p>
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
            {PAGES.map((p) => (
              <li key={p}><a href="#">{p}</a></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-wordmark" aria-hidden>LA CASA NOSTRA</div>
    </footer>
  )
}
