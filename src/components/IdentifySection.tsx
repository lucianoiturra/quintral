"use client";
import { useEffect, useState } from "react";
import type { Prefill } from "@/components/ContributeForm";
import { etiquetaHospedero } from "@/lib/hosts";
import { fileToBase64 } from "@/lib/fileToBase64";
import { inferImageMediaType } from "@/lib/imageMime";
import type { IdentifyResult } from "@/lib/types";
import { ZONAS, type ZonaId } from "@/lib/zonas";

export default function IdentifySection({ onPrefill }: { onPrefill: (p: Prefill) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [resultado, setResultado] = useState<IdentifyResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zonaId, setZonaId] = useState<ZonaId | "">("");

  useEffect(() => {
    if (!previa) return;
    return () => URL.revokeObjectURL(previa);
  }, [previa]);

  function elegir(file: File | null) {
    setArchivo(file);
    setResultado(null);
    setError(null);
    setPrevia(file ? URL.createObjectURL(file) : null);
  }

  async function analizar() {
    if (!archivo) return;

    if (!inferImageMediaType(archivo)) {
      setError("Solo se permiten imagenes JPG, PNG o WEBP.");
      return;
    }

    if (archivo.size > 4 * 1024 * 1024) {
      setError("La imagen es demasiado grande. Maximo 4 MB.");
      return;
    }

    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const { base64, mediaType } = await fileToBase64(archivo);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType,
          ...(zonaId ? { zona: zonaId } : {}),
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "La IA no pudo analizar la imagen.");
      }

      setResultado((await res.json()) as IdentifyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar.");
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
      fotoArchivo: archivo,
    });

    document.getElementById("aportar")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="identificar" className="section">
      <div className="section-head">
        <p className="kicker" data-num="01">
          Vision por computador
        </p>
        <h2>Identificacion automatica con IA</h2>
        <p>Sube una fotografia del ejemplar. El modelo estima especie, hospedero probable y fenologia.</p>
      </div>

      <div className="identify-grid">
        <div className="card card-pad">
          <label className="dropzone">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
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
                <small>JPG, PNG o WEBP, hasta 4 MB</small>
              </span>
            )}
          </label>

          <p className="identify-hint">
            Para mejor identificacion, enfoca las hojas y la corteza del arbol hospedero, no solo
            el quintral. Una foto cercana a las hojas es clave.
          </p>

          <label className="identify-zona">
            <span>¿Dónde se tomó la foto? (opcional — mejora la precisión)</span>
            <select value={zonaId} onChange={(e) => setZonaId(e.target.value as ZonaId | "")}>
              <option value="">No especificar</option>
              {ZONAS.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <div className="identify-actions">
            <span className="identify-meta">Modelo Quintral v0.2 (demo)</span>
            <div className="identify-buttons">
              {archivo ? (
                <button type="button" className="btn btn--ghost" onClick={() => elegir(null)}>
                  Limpiar
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--primary"
                onClick={analizar}
                disabled={!archivo || cargando}
              >
                {cargando ? "Analizando..." : "Analizar"}
              </button>
            </div>
          </div>
        </div>

        <div className="card card-pad result">
          <h3 className="result-title">Resultado del analisis</h3>
          {error ? <p className="alert alert--error">{error}</p> : null}

          {!resultado && !error ? (
            <p className="result-empty">
              Sube una imagen para evaluar el ejemplar y obtener los hospederos mas probables, la
              confianza del modelo y notas de campo.
            </p>
          ) : null}

          {resultado ? (
            <>
              <div className="result-verdict">
                <span className={`badge ${resultado.esQuintral ? "badge--yes" : "badge--maybe"}`}>
                  {resultado.esQuintral ? "Es quintral" : "Sin certeza"}
                </span>
              </div>

              <div className="result-options">
                <p className="result-options-label">Hospederos mas probables</p>
                {resultado.opciones.map((opcion, index) => {
                  const pct = Math.round(opcion.confianza * 100);
                  return (
                    <div key={opcion.hospedero + index} className="result-option">
                      <div className="result-conf-head">
                        <span>
                          <strong>{index + 1}o</strong> {etiquetaHospedero(opcion.hospedero)}
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
                        <span style={{ transform: `scaleX(${opcion.confianza})` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <dl className="result-data">
                <div>
                  <dt>Fenologia</dt>
                  <dd>{resultado.fenologia || "-"}</dd>
                </div>
                <div>
                  <dt>Notas</dt>
                  <dd>{resultado.notas || "-"}</dd>
                </div>
              </dl>

              {resultado.opciones[0].confianza < 0.4 ? (
                <p className="alert alert--error">
                  Baja confianza: confirma el hospedero a mano en el formulario.
                </p>
              ) : null}
            </>
          ) : null}

          {resultado || archivo ? (
            <button type="button" className="btn btn--forest result-cta" onClick={agregarAlMapa}>
              {resultado ? "Agregar al mapa" : "Agregar foto al mapa manualmente"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
