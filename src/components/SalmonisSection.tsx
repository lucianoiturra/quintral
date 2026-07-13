"use client";
import { useState } from "react";
import OdChart, { type SerieOD } from "@/components/OdChart";
import type { Hospedero } from "@/lib/antibacteriano";
import {
  AISLADOS,
  CONCENTRACIONES,
  CONTROL_POSITIVO,
  CAUTELAS,
  HALLAZGO,
  LECTURA,
  NOTA_DATOS,
  aislado as getAislado,
  curvasDeAislado,
  inhibicionMaxima,
  type AisladoId,
} from "@/lib/salmonis";

const COLOR_HOSPEDERO: Record<Hospedero, string> = {
  litre: "var(--quintral)",
  quillay: "var(--forest-bright)",
};
const NOMBRE_HOSPEDERO: Record<Hospedero, string> = {
  litre: "Litre",
  quillay: "Quillay",
};
const CATEGORIAS = [...CONCENTRACIONES.map(String), "C+"];

export default function SalmonisSection() {
  const [activo, setActivo] = useState<AisladoId>("lf89");
  const a = getAislado(activo);
  const curvas = curvasDeAislado(activo);

  const series: SerieOD[] = curvas.map((c) => ({
    nombre: NOMBRE_HOSPEDERO[c.hospedero],
    color: COLOR_HOSPEDERO[c.hospedero],
    valores: [...c.od, c.controlPos],
    signif: [...c.signif, "***"],
  }));
  const maxOd = Math.max(...series.flatMap((s) => s.valores));
  const maxY = Math.ceil((maxOd * 1.2) / 0.1) * 0.1;

  return (
    <div className="salmonis">
      <h3 className="biblioteca-titulo">
        Bacterias marinas: <em>Piscirickettsia salmonis</em>
      </h3>
      <p className="salmonis-intro">
        La bacteria que causa la piscirickettsiosis, la principal enfermedad de
        los salmones en Chile. Enfrentamos los mismos extractos de quintral
        (litre y quillay) a tres aislados distintos, a 2–128 µg/mL, midiendo el
        crecimiento por absorbancia a 600 nm. Aquí el extracto{" "}
        <strong>sí inhibió el crecimiento</strong>.
      </p>

      <div
        className="tabs"
        role="tablist"
        aria-label="Aislado de P. salmonis"
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const i = AISLADOS.findIndex((x) => x.id === activo);
          const delta = e.key === "ArrowRight" ? 1 : -1;
          const next = AISLADOS[(i + delta + AISLADOS.length) % AISLADOS.length];
          setActivo(next.id);
          document.getElementById(`tab-salmonis-${next.id}`)?.focus();
        }}
      >
        {AISLADOS.map((x) => (
          <button
            key={x.id}
            id={`tab-salmonis-${x.id}`}
            type="button"
            role="tab"
            aria-selected={x.id === activo}
            aria-controls="salmonis-panel"
            tabIndex={x.id === activo ? 0 : -1}
            className={`tab${x.id === activo ? " tab--active" : ""}`}
            onClick={() => setActivo(x.id)}
          >
            <em>P. salmonis</em> {x.nombre}
          </button>
        ))}
      </div>

      <div
        className="chart-grid"
        id="salmonis-panel"
        role="tabpanel"
        aria-labelledby={`tab-salmonis-${activo}`}
      >
        <div className="card card-pad">
          <h4 className="result-title">
            <em>P. salmonis</em> {a.nombre} · {a.etiqueta}
          </h4>
          <OdChart categorias={CATEGORIAS} series={series} maxY={maxY} />
          <ul className="chart-legend">
            {series.map((s) => (
              <li key={s.nombre}>
                <span className="legend-dot" style={{ background: s.color }} />
                {s.nombre}
              </li>
            ))}
          </ul>
          <ul className="salmonis-inhibicion">
            {curvas.map((c) => (
              <li key={c.hospedero}>
                <strong>{inhibicionMaxima(c)}%</strong> menos crecimiento con
                extracto de {NOMBRE_HOSPEDERO[c.hospedero].toLowerCase()} a 128
                µg/mL
              </li>
            ))}
          </ul>
          <p className="data-source">
            Eje X: µg/mL de extracto (0 = control de crecimiento). C+ ={" "}
            {CONTROL_POSITIVO}.
          </p>
        </div>

        <div className="card card-pad">
          <h4 className="result-title">Microplaca del ensayo</h4>
          <figure className="antibiograma-fig salmonis-fig">
            <img
              src={a.microplaca}
              alt={a.pieMicroplaca}
              loading="lazy"
              onError={(e) => {
                const fig = e.currentTarget.closest("figure");
                if (fig) (fig as HTMLElement).style.display = "none";
              }}
            />
            <figcaption>{a.pieMicroplaca}</figcaption>
          </figure>
          <p className="alert alert--ok chart-note">{LECTURA[activo]}</p>
        </div>
      </div>

      <p className="alert alert--ok chart-note antibacteriano-lectura">
        {HALLAZGO}
      </p>

      <details className="ensayo-detalle">
        <summary>Qué todavía no podemos afirmar</summary>
        <ul className="ficha-lista">
          {CAUTELAS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="data-source">{NOTA_DATOS}</p>
      </details>
    </div>
  );
}
