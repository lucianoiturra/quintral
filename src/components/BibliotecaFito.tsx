"use client";
import { BIBLIOTECA } from "@/lib/bibliotecaFito";

export default function BibliotecaFito() {
  return (
    <div className="biblioteca">
      <h3 className="biblioteca-titulo">Biblioteca fitoquímica</h3>
      <p className="biblioteca-intro">
        Cada compuesto detectado en el quintral, con su función en la planta, las
        aplicaciones biomédicas que se investigan y los estudios que lo respaldan.
      </p>

      <div className="biblioteca-grid">
        {BIBLIOTECA.map((ficha) => (
          <article key={ficha.id} className="card card-pad ficha">
            <h4 className="ficha-nombre">{ficha.nombre}</h4>

            <p className="ficha-label">¿Qué es?</p>
            <p>{ficha.queEs}</p>

            <p className="ficha-label">¿Qué función tiene en la planta?</p>
            <ul className="ficha-lista">
              {ficha.funcionEnPlanta.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <p className="ficha-label">¿Qué aplicaciones biomédicas se estudian?</p>
            <ul className="ficha-lista">
              {ficha.aplicacionesBiomedicas.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>

            <details className="ficha-presencia">
              <summary>¿Está presente en el quintral?</summary>
              <p className="alert alert--ok">✅ Sí, detectado en el quintral.</p>
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
