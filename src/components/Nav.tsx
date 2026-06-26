export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="#top" className="brand" aria-label="Quintral Insight, inicio">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path
                d="M12 21C12 14 7 11 4 10c0 6 3 10 8 11Zm0 0c0-7 5-10 8-11 0 6-3 10-8 11Z"
                fill="currentColor"
              />
              <circle cx="17.5" cy="6.5" r="2.4" fill="var(--quintral)" />
            </svg>
          </span>
          Quintral <strong>Insight</strong>
        </a>
        <div className="nav-links">
          <a href="#identificar">Identificar</a>
          <a href="#mapa">Mapa</a>
          <a href="#comparar">Compuestos</a>
          <a href="#predecir">Predicción</a>
          <a href="#aportar">Ciencia ciudadana</a>
        </div>
      </div>
    </nav>
  );
}
