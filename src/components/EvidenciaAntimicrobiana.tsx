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

      <div className="ensayo-pasos">
        <article className="ensayo-paso">
          <span className="ensayo-num">1</span>
          <h4>La pregunta</h4>
          <p>¿Los extractos de quintral inhiben el crecimiento de bacterias?</p>
        </article>

        <article className="ensayo-paso">
          <span className="ensayo-num">2</span>
          <h4>Qué probamos</h4>
          <p>
            Extractos etanólicos de quintral hospedado en{" "}
            {HOSPEDEROS_ENSAYADOS.join(" y ")} frente a tres bacterias de referencia,
            a {CONCENTRACIONES.join("–")} µg/mL. Control positivo: {CONTROL_POSITIVO}.
          </p>
        </article>

        <article className="ensayo-veredicto">
          <span className="ensayo-num">3</span>
          <p className="ensayo-label">Resultado del ensayo 2026</p>
          <h4>Sin inhibición del crecimiento</h4>
          <ul className="ensayo-bacterias">
            {RESULTADOS.map((r) => (
              <li key={r.bacteria}>
                <span aria-hidden="true">✕</span> {r.bacteria}
              </li>
            ))}
          </ul>
        </article>

        <article className="ensayo-paso">
          <span className="ensayo-num">4</span>
          <h4>Qué significa</h4>
          <p>
            La ausencia de efecto también es evidencia: orienta hacia otros
            hospederos, solventes y concentraciones.
          </p>
        </article>
      </div>

      <details className="ensayo-detalle">
        <summary>Ver detalles del ensayo</summary>

        <p className="data-source">
          {NOTA_LITERATURA}
        </p>
        <p className="data-source">
          Concentraciones ensayadas: {CONCENTRACIONES.join(", ")} µg/mL. Control
          positivo: {CONTROL_POSITIVO} (sí mostró actividad); control negativo:{" "}
          {CONTROL_NEGATIVO}. Los antibiogramas a 1024 µg/mL no mostraron halos de
          inhibición para ninguna bacteria.
        </p>

        <div className="antimicrobiano-cols">
          <div>
            <h5>Factores que pueden influir</h5>
            <ul className="ficha-lista">
              {FACTORES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <h5>Investigaciones que continúan</h5>
            <ul className="ficha-lista">
              {LINEAS_FUTURAS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <div className="card card-pad ensayo-aprendizaje">
        <h4>¿Qué aprendimos?</h4>
        <p className="alert alert--ok">{APRENDIZAJE}</p>
      </div>
    </div>
  );
}
