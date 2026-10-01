import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Marquee from '../components/Marquee.jsx'
import localPhoto from '../assets/photos/local-entrance.jpg'
import cartaLeft from '../assets/carta-left.jpg'
import cartaCenter from '../assets/carta-center.jpg'
import cartaRight from '../assets/carta-right.jpg'
import heroPhoto from '../assets/photos/hero-table.jpg'
import localWall from '../assets/photos/local-wall.jpg'
import workKitchen from '../assets/photos/work-kitchen.jpg'

export default function Home() {
  const cartaPhotosRef = useRef(null)

  useEffect(() => {
    const el = cartaPhotosRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-open')
        } else {
          el.classList.remove('is-open')
        }
      },
      { threshold: 0.35 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* HERO */}
      <section className="hero" id="top">
        <p className="eyebrow">Bocadillería</p>
        <h1 className="hero-title">La Casa Nostra</h1>
        <p className="hero-sub">
          Pan crujiente, ingredientes de verdad y recetas que saben a casa.
          Bienvenido a La Casa Nostra.
        </p>
        <img
          className="hero-media"
          src={heroPhoto}
          alt="Bocadillos y patatas con salsa sobre mantel de cuadros en La Casa Nostra"
        />
      </section>

      {/* SOBRE NOSOTROS */}
      <section className="section centered" id="sobre">
        <h2 className="section-title">Sobre nosotros</h2>
        <p className="section-text">
          En La Casa Nostra creemos que un buen bocadillo no necesita complicarse.
          Pan recién hecho, producto de calidad y cariño en cada combinación.
          Somos ese sitio al que vienes por un bocata, y vuelves por la sensación
          de estar como en casa.
        </p>
      </section>

      {/* NUESTRA CARTA */}
      <section className="section centered" id="carta">
        <div className="carta-photos" ref={cartaPhotosRef}>
          <img className="polaroid polaroid-left" src={cartaLeft} alt="Fingers de pollo rebozado con salsa de mostaza y miel" />
          <img className="polaroid polaroid-center" src={cartaCenter} alt="Bocadillo de pollo con pisto y queso" />
          <img className="polaroid polaroid-right" src={cartaRight} alt="Mesa con bocadillos, hamburguesas, fingers y hummus de La Casa Nostra" />
        </div>
        <h2 className="section-title">Nuestra carta</h2>
        <p className="section-text">
          Desde los clásicos de toda la vida hasta combinaciones que sorprenden.
          Carnes jugosas, opciones veggie, salsas caseras y pan que marca la
          diferencia.
        </p>
        <Link className="btn btn-outline" to="/carta">
          Descubre nuestra carta completa
        </Link>
      </section>

      {/* MARQUEE */}
      <Marquee text="LA CASA NOSTRA" />

      {/* EL LOCAL */}
      <section className="section" id="local">
        <div className="two-cols">
          <img
            src={localPhoto}
            alt="Terraza y entrada de La Casa Nostra en Mataró"
            className="media-photo"
          />
          <img
            src={localWall}
            alt="Interior de La Casa Nostra: pared con fotos enmarcadas y mesas"
            className="media-box"
          />
        </div>
        <div className="centered">
          <h2 className="section-title">El local</h2>
          <p className="section-text">
            Un espacio acogedor, sin prisas y con ese ambiente de barrio donde todo
            el mundo es bienvenido. Perfecto para una comida rápida, una cena
            informal o quedar con amigos.
          </p>
        </div>
      </section>

      {/* TRABAJA CON NOSOTROS */}
      <section className="section" id="trabaja">
        <div className="two-cols work-cols">
          <div className="work-panel">
            <h2 className="section-title work-title">Trabaja con nosotros</h2>
            <p className="work-lead">¿Te gusta el buen comer y el trato cercano?</p>
            <p className="section-text work-text">
              En La Casa Nostra siempre buscamos gente con actitud, ganas y pasión
              por lo que hace.
            </p>
            <Link className="btn btn-outline" to="/trabaja">Únete al equipo</Link>
          </div>
          <img
            src={workKitchen}
            alt="Cocinero de La Casa Nostra terminando una hamburguesa en la cocina"
            className="media-box work-photo"
            loading="lazy"
          />
        </div>
      </section>

      {/* CIERRE */}
      <section className="closing">
        <p>Pasa, pide y disfruta.</p>
        <p>Aquí los bocadillos saben mejor.</p>
      </section>
    </>
  )
}
