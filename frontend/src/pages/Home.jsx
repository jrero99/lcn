import Marquee from '../components/Marquee.jsx'

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
        <div className="placeholder hero-media" role="img" aria-label="Imagen principal (pendiente)" />
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
          <div className="polaroid polaroid-left placeholder" role="img" aria-label="Bocadillo (pendiente)" />
          <div className="polaroid polaroid-center placeholder" role="img" aria-label="Plato de la carta (pendiente)" />
          <div className="polaroid polaroid-right placeholder" role="img" aria-label="Ración (pendiente)" />
        </div>
        <h2 className="section-title">Nuestra carta</h2>
        <p className="section-text">
          Desde los clásicos de toda la vida hasta combinaciones que sorprenden.
          Carnes jugosas, opciones veggie, salsas caseras y pan que marca la
          diferencia.
        </p>
        <a className="btn btn-outline" href="#carta-completa">
          Descubre nuestra carta completa
        </a>
      </section>

      {/* MARQUEE */}
      <Marquee text="LA CASA NOSTRA" />

      {/* EL LOCAL */}
      <section className="section" id="local">
        <div className="two-cols">
          <div className="placeholder media-photo" role="img" aria-label="El local (pendiente)" />
          <div className="placeholder media-box" />
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
            <a className="btn btn-outline" href="#empleo">Únete al equipo</a>
          </div>
          <div className="placeholder media-box" />
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
