export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col footer-col--brand">
          <h3>Quintral Insight</h3>
          <p className="footer-note">
            Plataforma de ciencia abierta para el estudio del quintral
            (<em>Tristerix corymbosus</em>) y su rol ecológico en el bosque
            esclerófilo de Chile central.
          </p>
        </div>
        <div className="footer-col">
          <h4>Sitios monitoreados</h4>
          <p>Cerro Manquehue</p>
          <p>Cerro El Carbón</p>
          <p>Cordillera de la costa central</p>
        </div>
        <div className="footer-col">
          <h4>Ciencia abierta</h4>
          <p>
            Los datos abiertos y el código alimentan un proyecto escolar de
            ciencias y tecnología.
          </p>
        </div>
      </div>
      <div className="footer-base">
        © 2026 Quintral Insight · Proyecto de Ciencias y Tecnología
      </div>
    </footer>
  );
}
