"use client";
import {
  RESULTADOS,
  CONCENTRACIONES,
  CONTROL_POSITIVO,
  CONTROL_NEGATIVO,
  HOSPEDEROS_ENSAYADOS,
  NOTA_LITERATURA,
  FACTORES,
  LINEAS_FUTURAS,
  APRENDIZAJE,
} from "@/lib/antimicrobiano";

export default function EvidenciaAntimicrobiana() {
  return (
    <div className="antimicrobiano">
      <h3 className="biblioteca-titulo">Evidencia sobre actividad antimicrobiana</h3>
      <p className="biblioteca-intro">{NOTA_LITERATURA}</p>

      <div className="card card-pad">
        <h4>Resultados de Quintral Insight (proyecto 2026)</h4>
        <p>
          Se evaluaron extractos etanólicos de quintral hospedado en{" "}
          {HOSPEDEROS_ENSAYADOS.join(" y ")} frente a tres bacterias de referencia.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Bacteria</th>
              <th scope="col">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {RESULTADOS.map((r) => (
              <tr key={r.bacteria}>
                <th scope="row">{r.bacteria}</th>
                <td>❌ Sin inhibición del crecimiento</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="data-source">
          Concentraciones ensayadas: {CONCENTRACIONES.join(", ")} µg/mL. Control
          positivo: {CONTROL_POSITIVO}; control negativo: {CONTROL_NEGATIVO}. Los
          antibiogramas a 1024 µg/mL no mostraron halos de inhibición para ninguna
          bacteria, mientras que el control con {CONTROL_POSITIVO} sí presentó
          actividad.
        </p>
      </div>

      <div className="antimicrobiano-cols">
        <div className="card card-pad">
          <h4>Factores que pueden influir</h4>
          <p>La ausencia de actividad no significa que el quintral no tenga compuestos bioactivos. Pueden influir:</p>
          <ul className="ficha-lista">
            {FACTORES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="card card-pad">
          <h4>Investigaciones que continúan</h4>
          <ul className="ficha-lista">
            {LINEAS_FUTURAS.map((l) => (
              <li key={l}>🔬 {l}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card card-pad">
        <h4>¿Qué aprendimos?</h4>
        <p className="alert alert--ok">{APRENDIZAJE}</p>
      </div>
    </div>
  );
}
