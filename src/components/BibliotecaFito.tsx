"use client";
import { useEffect, useState } from "react";
import { type FichaCompuesto } from "@/lib/bibliotecaFito";
import MatrizFito from "@/components/MatrizFito";

export default function BibliotecaFito() {
  const [activa, setActiva] = useState<FichaCompuesto | null>(null);

  useEffect(() => {
    if (!activa) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiva(null);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activa]);

  return (
    <div className="biblioteca">
      <MatrizFito onSelectCompuesto={setActiva} />

      {activa ? (
        <div
          className="fito-modal-overlay"
          role="presentation"
          onClick={() => setActiva(null)}
        >
          <div
            className="fito-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fito-modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="fito-modal-cerrar"
              aria-label="Cerrar"
              onClick={() => setActiva(null)}
            >
              ×
            </button>

            <span className="ficha-familia">{activa.familia}</span>
            <h4 id="fito-modal-titulo" className="ficha-nombre">
              {activa.nombre}
            </h4>
            <p className="ficha-resumen">{activa.resumen}</p>

            <ul className="ficha-chips" aria-label="Aplicaciones biomédicas">
              {activa.aplicacionesBiomedicas.map((a) => (
                <li key={a} className="ficha-chip">
                  {a.replace(/\.$/, "")}
                </li>
              ))}
            </ul>

            <p className="ficha-label">¿Qué es?</p>
            <p>{activa.queEs}</p>

            <p className="ficha-label">¿Qué función tiene en la planta?</p>
            <ul className="ficha-lista">
              {activa.funcionEnPlanta.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <p className="alert alert--ok">✅ Detectado en el quintral.</p>

            <p className="ficha-label">Estudios científicos</p>
            <ul className="ficha-estudios">
              {activa.estudios.map((e) => (
                <li key={e.url + e.cita}>
                  <strong>{e.cita}.</strong> {e.descripcion}{" "}
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    Ver estudio
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
