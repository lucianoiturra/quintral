"use client";
import { useState } from "react";
import type { IdentifyResult } from "@/lib/types";
import { etiquetaHospedero } from "@/lib/hosts";
import { fileToBase64 } from "@/lib/fileToBase64";
import { uploadFoto } from "@/lib/uploadFoto";
import type { Prefill } from "@/components/ContributeForm";

export default function IdentifySection({ onPrefill }: { onPrefill: (p: Prefill) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [resultado, setResultado] = useState<IdentifyResult | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegir(f: File | null) {
    setArchivo(f);
    setResultado(null);
    setFotoUrl(null);
    setError(null);
    setPrevia(f ? URL.createObjectURL(f) : null);
  }

  async function analizar() {
    if (!archivo) return;
    if (archivo.size > 4 * 1024 * 1024) {
      setError("La imagen es demasiado grande. Máximo 4 MB.");
      return;
    }
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const url = await uploadFoto(archivo);
      setFotoUrl(url);
      const { base64, mediaType } = await fileToBase64(archivo);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      if (!res.ok) throw new Error("La IA no pudo analizar la imagen.");
      setResultado((await res.json()) as IdentifyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al analizar.");
    } finally {
      setCargando(false);
    }
  }

  function agregarAlMapa() {
    onPrefill({
      ...(resultado
        ? {
            hospedero: resultado.opciones[0].hospedero,
            fenologia: resultado.fenologia,
            resultadoIa: resultado,
          }
        : {}),
      fotoUrl,
    });
    document.getElementById("aportar")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="identificar" className="section">
      <div className="section-head">
        <p className="kicker" data-num="01">Visión por computador</p>
        <h2>Identificación automática con IA</h2>
        <p>
          Sube una fotografía del ejemplar. El modelo estima especie, hospedero
          probable y fenología.
        </p>
      </div>

      <div className="identify-grid">
        {/* — Columna de subida — */}
        <div className="card card-pad">
          <label className="dropzone">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => elegir(e.target.files?.[0] ?? null)}
              hidden
            />
            {previa ? (
              <img src={previa} alt="Vista previa del ejemplar" className="dropzone-preview" />
            ) : (
              <span className="dropzone-empty">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true">
                  <path
                    d="M12 16V4m0 0L8 8m4-4 4 4M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <strong>Haz clic para subir una foto</strong>
                <small>JPG · PNG, hasta 4 MB</small>
              </span>
            )}
          </label>

          <p className="identify-hint">
            Para mejor identificación, enfoca las hojas y la corteza del árbol hospedero,
            no solo el quintral. Una foto cercana a las hojas es clave.
          </p>

          <div className="identify-actions">
            <span className="identify-meta">Modelo Quintral&nbsp;v0.2 (demo)</span>
            <div className="identify-buttons">
              {archivo && (
                <button type="button" className="btn btn--ghost" onClick={() => elegir(null)}>
                  Limpiar
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary"
                onClick={analizar}
                disabled={!archivo || cargando}
              >
                {cargando ? "Analizando…" : "Analizar"}
              </button>
            </div>
          </div>
        </div>

        {/* — Columna de resultado — */}
        <div className="card card-pad result">
          <h3 className="result-title">Resultado del análisis</h3>
          {error && <p className="alert alert--error">{error}</p>}

          {!resultado && !error && (
            <p className="result-empty">
              Sube una imagen para evaluar el ejemplar y obtener los hospederos
              más probables, la confianza del modelo y notas de campo.
            </p>
          )}

          {resultado && (
            <>
              <div className="result-verdict">
                <span className={`badge ${resultado.esQuintral ? "badge--yes" : "badge--maybe"}`}>
                  {resultado.esQuintral ? "Es quintral" : "Sin certeza"}
                </span>
              </div>

              <div className="result-options">
                <p className="result-options-label">Hospederos más probables</p>
                {resultado.opciones.map((op, i) => {
                  const pct = Math.round(op.confianza * 100);
                  return (
                    <div key={op.hospedero + i} className="result-option">
                      <div className="result-conf-head">
                        <span>
                          <strong>{i + 1}º</strong> {etiquetaHospedero(op.hospedero)}
                        </span>
                        <strong>{pct}%</strong>
                      </div>
                      <div
                        className="meter"
                        role="meter"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span style={{ transform: `scaleX(${op.confianza})` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <dl className="result-data">
                <div>
                  <dt>Fenología</dt>
                  <dd>{resultado.fenologia || "—"}</dd>
                </div>
                <div>
                  <dt>Notas</dt>
                  <dd>{resultado.notas || "—"}</dd>
                </div>
              </dl>

              {resultado.opciones[0].confianza < 0.4 && (
                <p className="alert alert--error">
                  Baja confianza: confirma el hospedero a mano en el formulario.
                </p>
              )}
            </>
          )}

          {(resultado || fotoUrl) && (
            <button type="button" className="btn btn--forest result-cta" onClick={agregarAlMapa}>
              {resultado ? "Agregar al mapa" : "Agregar foto al mapa manualmente"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
