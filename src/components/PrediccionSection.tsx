"use client";
import { useState } from "react";
import BarChart, { type Barra } from "@/components/BarChart";
import { HOSPEDEROS, etiquetaHospedero } from "@/lib/hosts";
import { COMPUESTOS, PERFIL_REFERENCIA } from "@/lib/fitoquimica";
import type { Host } from "@/lib/types";

export default function PrediccionSection() {
  const [hospedero, setHospedero] = useState<Host>("aromo");
  const [fenologia, setFenologia] = useState("");
  const [enviado, setEnviado] = useState<{ hospedero: Host } | null>(null);

  const barras: Barra[] = COMPUESTOS.map((c) => ({
    etiqueta: c.etiqueta,
    valor: PERFIL_REFERENCIA[c.id],
    unidad: c.unidad,
    color: "var(--forest)",
  }));

  return (
    <section id="predecir" className="section--tint">
      <div className="section section-inner">
        <div className="section-head">
          <p className="kicker" data-num="04">
            Estimación
          </p>
          <h2>Predicción fitoquímica del ejemplar</h2>
          <p>
            Indica el hospedero y la fenología del ejemplar para ver su perfil
            fitoquímico de referencia.
          </p>
        </div>

        <div className="chart-grid">
          <form
            className="card card-pad predecir-form"
            onSubmit={(e) => {
              e.preventDefault();
              setEnviado({ hospedero });
            }}
          >
            <label className="field">
              <span>Hospedero</span>
              <select
                value={hospedero}
                onChange={(e) => setHospedero(e.target.value as Host)}
              >
                {HOSPEDEROS.map((h) => (
                  <option key={h} value={h}>
                    {etiquetaHospedero(h)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Fenología</span>
              <input
                type="text"
                value={fenologia}
                onChange={(e) => setFenologia(e.target.value)}
                placeholder="en flor, con frutos, vegetativo…"
              />
            </label>

            <button type="submit" className="btn btn--primary contribute-submit">
              Ver perfil de referencia
            </button>
          </form>

          <div className="card card-pad">
            {!enviado ? (
              <p className="result-empty">
                Completa el formulario para ver el perfil fitoquímico de referencia
                del ejemplar.
              </p>
            ) : (
              <>
                <h3 className="result-title">
                  Perfil de referencia para un ejemplar en{" "}
                  {etiquetaHospedero(enviado.hospedero)}
                </h3>
                <BarChart barras={barras} />
                <p className="alert alert--ok chart-note">
                  Valores de referencia (quintral medido 2025), no medición de tu
                  ejemplar. La variación por hospedero está en estudio (fase 2026).
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
