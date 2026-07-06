"use client";
import { useEffect, useState } from "react";
import ConnectionBadge from "@/components/ConnectionBadge";

const SECTIONS = ["identificar", "mapa", "comparar", "predecir", "antibacteriano", "preguntas", "aportar"] as const;

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function link(href: string, label: string) {
    const id = href.replace("#", "");
    return (
      <a
        href={href}
        className={active === id ? "active" : undefined}
        onClick={() => setOpen(false)}
      >
        {label}
      </a>
    );
  }

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
          {link("#identificar", "Identificar")}
          {link("#mapa", "Mapa")}
          {link("#comparar", "Compuestos")}
          {link("#predecir", "Predicción")}
          {link("#antibacteriano", "Antibacteriano")}
          {link("#preguntas", "Preguntas")}
          {link("#aportar", "Ciencia ciudadana")}
        </div>
        <ConnectionBadge />
      </div>
    </nav>
  );
}
