import { Link } from 'react-router-dom'
import Marquee from '../components/Marquee.jsx'
import localPhoto from '../assets/local.png'
import cartaLeft from '../assets/carta-left.jpg'
import cartaCenter from '../assets/carta-center.jpg'
import cartaRight from '../assets/carta-right.jpg'
import heroAmbience from '../assets/photos/hero-ambience.jpg'
import localWall from '../assets/photos/local-wall.jpg'
import workDining from '../assets/photos/work-dining.jpg'

export default function Home() {
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
          src={heroAmbience}
          alt="Mesa de La Casa Nostra con mantel de cuadros y la carta de la casa"
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
        <div className="carta-photos">
          <img className="polaroid polaroid-left" src={cartaLeft} alt="Bocadillo de La Casa Nostra" />
          <img className="polaroid polaroid-center" src={cartaCenter} alt="Plato de la carta de La Casa Nostra" />
          <img className="polaroid polaroid-right" src={cartaRight} alt="Ración de La Casa Nostra" />
        </div>
        <h2 className="section-title">Nuestra carta</h2>
        <p className="section-text">
          Desde los clásicos de toda la vida hasta combinaciones que sorprenden.
          Carnes jugosas, opciones veggie, salsas caseras y pan que marca la
          diferencia.
        </p>
        <Link className="btn btn-outline" to="/hacer-pedido">
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
        <div className="two-cols">
          <div className="work-panel">
            <h2 className="section-title work-title">Trabaja con nosotros</h2>
            <p className="work-lead">¿Te gusta el buen comer y el trato cercano?</p>
            <p className="section-text work-text">
              En La Casa Nostra siempre buscamos gente con actitud, ganas y pasión
              por lo que hace.
            </p>
            <a className="btn btn-outline" href="#trabaja">Únete al equipo</a>
          </div>
          <img
            src={workDining}
            alt="Sala de La Casa Nostra con mesas vestidas y ambiente acogedor"
            className="media-box"
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
