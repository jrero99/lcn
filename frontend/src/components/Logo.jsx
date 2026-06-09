import logoRed from '../assets/logo/logo-red.svg'
import logoCream from '../assets/logo/logo-cream.svg'

// Logotip oficial de La Casa Nostra.
// variant: "red" (fons clars, p.ex. header) · "cream" (fons foscos, p.ex. footer)
export default function Logo({ variant = 'red', className = '' }) {
  const src = variant === 'cream' ? logoCream : logoRed
  return <img src={src} alt="La Casa Nostra" className={`logo ${className}`} />
}
