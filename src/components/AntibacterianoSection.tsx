"use client";
import { useState } from "react";
import OdChart, { type SerieOD } from "@/components/OdChart";
import SalmonisSection from "@/components/SalmonisSection";
import {
  BACTERIAS,
  CONCENTRACIONES,
  curvasDeBacteria,
  antibiogramasDeBacteria,
  bacteria as getBacteria,
  NOTA_DATOS,
  type BacteriaId,
  type Hospedero,
} from "@/lib/antibacteriano";

const COLOR_HOSPEDERO: Record<Hospedero, string> = {
  litre: "var(--quintral)",
  quillay: "var(--forest-bright)",
};
const NOMBRE_HOSPEDERO: Record<Hospedero, string> = {
  litre: "Litre",
  quillay: "Quillay",
};
const CATEGORIAS = [...CONCENTRACIONES.map(String), "C+", "C−"];

export default function AntibacterianoSection() {
  const [activa, setActiva] = useState<BacteriaId>("e-coli");
  const b = getBacteria(activa);
  const curvas = curvasDeBacteria(activa);
  const antibiogramas = antibiogramasDeBacteria(activa);

  const series: SerieOD[] = curvas.map((c) => ({
    nombre: NOMBRE_HOSPEDERO[c.hospedero],
    color: COLOR_HOSPEDERO[c.hospedero],
    valores: [...c.puntos.map((p) => p.od), c.controlPos, c.controlNeg],
  }));
  const maxOd = Math.max(...series.flatMap((s) => s.valores));
  const maxY = Math.ceil((maxOd * 1.15) / 0.1) * 0.1;

  return (
    <section id="antibacteriano" className="section">
      <div className="section-head">
        <p className="kicker" data-num="05">
          Ensayo antibacteriano
        </p>
        <h2>Actividad antibacteriana del extracto de quintral (2026)</h2>
        <p>
          Extractos etanólicos de quintral obtenidos desde litre y quillay,
          enfrentados a tres bacterias de referencia y a la bacteria marina{" "}
          <em>Piscirickettsia salmonis</em> por microdilución (OD a 600 nm) y
          antibiograma. Más OD = más crecimiento = menos inhibición.
        </p>
      </div>

      <div
        className="tabs"
        role="tablist"
        aria-label="Bacteria del ensayo"
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const i = BACTERIAS.findIndex((bac) => bac.id === activa);
          const delta = e.key === "ArrowRight" ? 1 : -1;
          const next = BACTERIAS[(i + delta + BACTERIAS.length) % BACTERIAS.length];
          setActiva(next.id);
          document.getElementById(`tab-${next.id}`)?.focus();
        }}
      >
        {BACTERIAS.map((bac) => (
          <button
            key={bac.id}
            id={`tab-${bac.id}`}
            type="button"
            role="tab"
            aria-selected={bac.id === activa}
            aria-controls="antibacteriano-panel"
            tabIndex={bac.id === activa ? 0 : -1}
            className={`tab${bac.id === activa ? " tab--active" : ""}`}
            onClick={() => setActiva(bac.id)}
          >
            <em>{bac.nombre}</em> {bac.cepa}
          </button>
        ))}
      </div>

      <div
        className="chart-grid"
        id="antibacteriano-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activa}`}
      >
        <div className="card card-pad">
          <h3 className="result-title">
            <em>{b.nombre}</em> {b.cepa} · Gram {b.gram}
          </h3>
          <OdChart categorias={CATEGORIAS} series={series} maxY={maxY} />
          <ul className="chart-legend">
            {series.map((s) => (
              <li key={s.nombre}>
                <span className="legend-dot" style={{ background: s.color }} />
                {s.nombre}
              </li>
            ))}
          </ul>
          <p className="data-source">
            Eje X: µg/mL de extracto (0 = control de crecimiento). C+ =
            ampicilina, C− = solo medio.
          </p>
        </div>

        <div className="card card-pad">
          <h3 className="result-title">Antibiograma (halo de inhibición)</h3>
          {antibiogramas.length === 0 ? (
            <p className="result-empty">
              Sin foto de antibiograma para esta bacteria.
            </p>
          ) : (
            <div className="antibiograma-grid">
              {antibiogramas.map((f) => (
                <figure key={f.archivo} className="antibiograma-fig">
                  <img
                    src={f.archivo}
                    alt={f.pie}
                    loading="lazy"
                    onError={(e) => {
                      const fig = e.currentTarget.closest("figure");
                      if (fig) (fig as HTMLElement).style.display = "none";
                    }}
                  />
                  <figcaption>{f.pie}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <p className="alert alert--ok chart-note">{NOTA_DATOS}</p>
        </div>
      </div>

      <p className="alert alert--ok chart-note antibacteriano-lectura">
        Lectura honesta: en estas tres bacterias de referencia el extracto
        (128–1024 µg/mL) mantuvo el crecimiento similar al control sin extracto,
        mientras que la ampicilina (C+) sí lo inhibió. En medio líquido el
        extracto de quintral no mostró actividad antibacteriana apreciable; en
        antibiograma se observó un halo menor para algunas combinaciones.
        Resultado experimental propio 2026.
      </p>

      <SalmonisSection />
    </section>
  );
}
