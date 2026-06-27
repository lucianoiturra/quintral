"use client";
import { useEffect, useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

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

        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="nav-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        <div id="nav-menu" className={`nav-links${open ? " nav-links--open" : ""}`}>
          <a href="#identificar" onClick={() => setOpen(false)}>Identificar</a>
          <a href="#mapa" onClick={() => setOpen(false)}>Mapa</a>
          <a href="#comparar" onClick={() => setOpen(false)}>Compuestos</a>
          <a href="#predecir" onClick={() => setOpen(false)}>Predicción</a>
          <a href="#aportar" onClick={() => setOpen(false)}>Ciencia ciudadana</a>
        </div>
      </div>

    </nav>
  );
}
