"use client";
import RadarChart, { type RadarSerie } from "@/components/RadarChart";
import {
  COMPUESTOS,
  MUESTRAS,
  maxCompuesto,
  NOTA_LITERATURA,
} from "@/lib/fitoquimica";
import BibliotecaFito from "@/components/BibliotecaFito";
import EvidenciaAntimicrobiana from "@/components/EvidenciaAntimicrobiana";

const COLORES_MUESTRA = ["var(--quintral)", "var(--forest-bright)"];

export default function CompararSection() {
  const ejes = COMPUESTOS.map((c) =>
    maxCompuesto(c.id) === 0 ? `${c.etiqueta} (n/d)` : c.etiqueta,
  );

  const series: RadarSerie[] = MUESTRAS.map((m, i) => ({
    nombre: m.etiqueta,
    color: COLORES_MUESTRA[i % COLORES_MUESTRA.length],
    valores: COMPUESTOS.map((c) => {
      const max = maxCompuesto(c.id);
      const v = m.valores[c.id];
      return max === 0 || v === null ? null : v / max;
    }),
  }));

  return (
    <section id="comparar" className="section">
      <div className="section-head">
        <p className="kicker" data-num="03">
          Análisis fitoquímico
        </p>
        <h2>Comparar compuestos entre hospederos</h2>
        <p>
          Dos muestras reales de laboratorio del quintral medidas en 2025 y una
          biblioteca de los compuestos detectados en la especie. En 2026 sumamos
          evidencia experimental sobre su actividad antimicrobiana. La comparación
          cuantitativa entre hospederos sigue siendo un objetivo abierto.
        </p>
      </div>

      <div className="chart-grid">
        <div className="card card-pad">
          <RadarChart ejes={ejes} series={series} />
          <ul className="chart-legend">
            {series.map((s) => (
              <li key={s.nombre}>
                <span className="legend-dot" style={{ background: s.color }} />
                {s.nombre}
              </li>
            ))}
          </ul>
        </div>

        <div className="card card-pad">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Compuesto</th>
                {MUESTRAS.map((m) => (
                  <th scope="col" key={m.id}>
                    {m.etiqueta}
                  </th>
                ))}
                <th scope="col">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {COMPUESTOS.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.etiqueta}</th>
                  {MUESTRAS.map((m) => (
                    <td key={m.id}>{m.valores[c.id] ?? "n/d"}</td>
                  ))}
                  <td>{c.unidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="data-source">
            Fuente: {MUESTRAS[0].cita} · códigos{" "}
            {MUESTRAS.map((m) => m.codigo).join(", ")}.
          </p>
          <p className="alert alert--ok chart-note">{NOTA_LITERATURA}</p>
        </div>
      </div>

      <BibliotecaFito />
      <EvidenciaAntimicrobiana />
    </section>
  );
}
