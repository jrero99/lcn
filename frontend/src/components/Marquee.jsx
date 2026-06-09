// Banda de text en moviment continu. Es duplica el contingut per a un bucle
// sense talls.
export default function Marquee({ text = 'LA CASA NOSTRA', repeat = 10 }) {
  const items = Array.from({ length: repeat }, (_, i) => i)
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {items.map((i) => (
          <span key={`a${i}`} className="marquee-item">{text}</span>
        ))}
        {items.map((i) => (
          <span key={`b${i}`} className="marquee-item">{text}</span>
        ))}
      </div>
    </div>
  )
}
