"use client";
import { BIBLIOTECA, PROPIEDADES_CANONICAS, type FichaCompuesto } from "@/lib/bibliotecaFito";

export default function MatrizFito({
  onSelectCompuesto,
}: {
  onSelectCompuesto?: (ficha: FichaCompuesto) => void;
}) {
  return (
    <div className="fito-matriz">
      <div className="fito-matriz-scroll">
        <table className="fito-matriz-tabla">
          <thead>
            <tr>
              <th scope="col">Compuesto</th>
              {PROPIEDADES_CANONICAS.map((p) => (
                <th scope="col" key={p}>
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BIBLIOTECA.map((ficha) => (
              <tr key={ficha.id}>
                <th scope="row">
                  {onSelectCompuesto ? (
                    <button
                      type="button"
                      className="fito-compuesto-btn"
                      onClick={() => onSelectCompuesto(ficha)}
                      aria-haspopup="dialog"
                    >
                      {ficha.nombre}
                    </button>
                  ) : (
                    ficha.nombre
                  )}
                </th>
                {PROPIEDADES_CANONICAS.map((p) => {
                  const tiene = ficha.propiedades.includes(p);
                  return (
                    <td key={p} className={tiene ? "fito-cell yes" : "fito-cell no"}>
                      <span className="sr-only">{tiene ? "sí" : "no"}</span>
                      <span aria-hidden="true">{tiene ? "✓" : "·"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fito-matriz-nota">
        Pincha el nombre de un compuesto para ver su ficha completa. Casi todos los
        compuestos del quintral son{" "}
        <strong>antiinflamatorios y antimicrobianos</strong>: por eso interesa
        estudiar su potencial biomédico.
      </p>
    </div>
  );
}
