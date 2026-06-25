export default function Hero() {
  return (
    <header id="top" className="hero">
      <div className="hero-photo" aria-hidden="true" />
      <div className="hero-veil" aria-hidden="true" />
      <div className="hero-inner rise">
        <span className="hero-eyebrow">Ciencia abierta del bosque esclerófilo</span>
        <h1 className="hero-title">
          Descubriendo el <span className="accent">quintral</span> de la cordillera central
        </h1>
        <p className="hero-lead">
          Identificación con IA, mapa georreferenciado y ciencia ciudadana sobre el
          quintral (<em>Tristerix corymbosus</em>) y sus árboles hospederos en Chile.
        </p>
        <div className="hero-cta">
          <a href="#identificar" className="btn btn--primary">
            Identificar un quintral
            <span aria-hidden="true">→</span>
          </a>
          <a href="#mapa" className="btn btn--on-dark">
            Explorar el mapa
          </a>
        </div>
      </div>
    </header>
  );
}
