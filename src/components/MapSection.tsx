"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Host, Observation } from "@/lib/types";
import { etiquetaHospedero, colorHospedero } from "@/lib/hosts";
import { filterObservations } from "@/lib/filterObservations";

const MapaQuintral = dynamic(() => import("@/components/MapaQuintral"), { ssr: false });

export default function MapSection({ observations }: { observations: Observation[] }) {
  const [cerro, setCerro] = useState<string | "todos">("todos");
  const [hospedero, setHospedero] = useState<Host | "todos">("todos");

  const cerros = useMemo(
    () => Array.from(new Set(observations.map((o) => o.cerro).filter(Boolean))) as string[],
    [observations],
  );
  const hospederosConDatos = useMemo(
    () => Array.from(new Set(observations.map((o) => o.hospedero))),
    [observations],
  );
  const visibles = useMemo(
    () => filterObservations(observations, cerro, hospedero),
    [observations, cerro, hospedero],
  );

  return (
    <section id="mapa" className="section--tint">
      <div className="section section-inner">
        <div className="section-head">
          <p className="kicker" data-num="02">Cartografía científica</p>
          <h2>Mapa georreferenciado de registros</h2>
          <p>
            Cada punto representa un ejemplar documentado, con hospedero, estado,
            altitud y exposición. {visibles.length} de {observations.length} registros visibles.
          </p>
        </div>

        <div className="map-filters">
          <div className="filter-group" role="group" aria-labelledby="filter-cerro-label">
            <span id="filter-cerro-label" className="filter-label">Cerro</span>
            <div className="pill-row">
              <button
                type="button"
                className="pill"
                aria-pressed={cerro === "todos"}
                onClick={() => setCerro("todos")}
              >
                Todos
              </button>
              {cerros.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="pill"
                  aria-pressed={cerro === c}
                  onClick={() => setCerro(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group" role="group" aria-labelledby="filter-hospedero-label">
            <span id="filter-hospedero-label" className="filter-label">Hospedero</span>
            <div className="pill-row">
              <button
                type="button"
                className="pill"
                aria-pressed={hospedero === "todos"}
                onClick={() => setHospedero("todos")}
              >
                Todos
              </button>
              {hospederosConDatos.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="pill"
                  aria-pressed={hospedero === h}
                  onClick={() => setHospedero(h)}
                >
                  <span className="dot" style={{ background: colorHospedero(h) }} />
                  {etiquetaHospedero(h)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="map-frame">
          <MapaQuintral observations={visibles} />
        </div>
      </div>
    </section>
  );
}
