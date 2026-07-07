"use client";
import { BIBLIOTECA } from "@/lib/bibliotecaFito";
import MatrizFito from "@/components/MatrizFito";

export default function BibliotecaFito() {
  return (
    <div className="biblioteca">
      <h3 className="biblioteca-titulo">Biblioteca fitoquímica</h3>
      <p className="biblioteca-intro">
        Los compuestos detectados en el quintral y las propiedades biomédicas que se
        investigan. La tabla resume el panorama; cada ficha guarda el detalle.
      </p>

      <MatrizFito />

      <div className="biblioteca-grid">
        {BIBLIOTECA.map((ficha) => (
          <article key={ficha.id} className="card card-pad ficha">
            <span className="ficha-familia">{ficha.familia}</span>
            <h4 className="ficha-nombre">{ficha.nombre}</h4>
            <p className="ficha-resumen">{ficha.resumen}</p>

            <ul className="ficha-chips" aria-label="Aplicaciones biomédicas">
              {ficha.aplicacionesBiomedicas.map((a) => (
                <li key={a} className="ficha-chip">
                  {a.replace(/\.$/, "")}
                </li>
              ))}
            </ul>

            <details className="ficha-detalle">
              <summary>Ver función y estudios</summary>

              <p className="ficha-label">¿Qué es?</p>
              <p>{ficha.queEs}</p>

              <p className="ficha-label">¿Qué función tiene en la planta?</p>
              <ul className="ficha-lista">
                {ficha.funcionEnPlanta.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <p className="alert alert--ok">✅ Detectado en el quintral.</p>

              <p className="ficha-label">Estudios científicos</p>
              <ul className="ficha-estudios">
                {ficha.estudios.map((e) => (
                  <li key={e.url + e.cita}>
                    <strong>{e.cita}.</strong> {e.descripcion}{" "}
                    <a href={e.url} target="_blank" rel="noopener noreferrer">
                      Ver estudio
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
