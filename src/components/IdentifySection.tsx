"use client";
import { useState } from "react";
import type { Prefill } from "@/components/ContributeForm";
import { etiquetaHospedero } from "@/lib/hosts";
import { fileToBase64 } from "@/lib/fileToBase64";
import type { AllowedImageType } from "@/lib/imageMime";
import type { IdentifyResult } from "@/lib/types";
import { ZONAS, type ZonaId } from "@/lib/zonas";
import RanurasFotos from "@/components/RanurasFotos";
import { ETIQUETAS_FOTO, type EtiquetaFoto, type ImagenEntrada } from "@/lib/imagenes";
import { uploadFoto } from "@/lib/uploadFoto";

export default function IdentifySection({ onPrefill }: { onPrefill: (p: Prefill) => void }) {
  const [archivos, setArchivos] = useState<Record<EtiquetaFoto, File | null>>({
    corteza: null,
    hoja: null,
    arbol: null,
    fruto: null,
  });
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [resultado, setResultado] = useState<IdentifyResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zonaId, setZonaId] = useState<ZonaId | "">("");

  const fotos = ETIQUETAS_FOTO.map((e) => ({ etiqueta: e.id, file: archivos[e.id] })).filter(
    (x): x is { etiqueta: EtiquetaFoto; file: File } => x.file !== null,
  );

  function cambiarFoto(etiqueta: EtiquetaFoto, file: File | null) {
    setArchivos((a) => ({ ...a, [etiqueta]: file }));
    setResultado(null);
    setFotoUrl(null);
    setError(null);
  }

  async function analizar() {
    if (fotos.length === 0) return;

    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const imagenes: ImagenEntrada[] = [];
      let primeraUrl: string | null = null;
      for (const { etiqueta, file } of fotos) {
        const url = await uploadFoto(file);
        if (!primeraUrl) primeraUrl = url;
        const { base64, mediaType } = await fileToBase64(file);
        imagenes.push({ base64, mediaType: mediaType as AllowedImageType, etiqueta });
      }
      setFotoUrl(primeraUrl);

      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imagenes, ...(zonaId ? { zona: zonaId } : {}) }),
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
      fotoArchivo: fotos[0]?.file ?? null,
      fotoUrl,
    });

    document.getElementById("aportar")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="identificar" className="section">
      <div className="section-head">
        <p className="kicker" data-num="01">
          Visión por computador
        </p>
        <h2>Identificación automática con IA</h2>
        <p>Sube una fotografía del ejemplar. El modelo estima especie, hospedero probable y fenología.</p>
      </div>

      <div className="identify-grid">
        <div className="card card-pad">
          <RanurasFotos archivos={archivos} onCambio={cambiarFoto} error={setError} />

          <label className="field identify-zona">
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
              {fotos.length > 0 ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setArchivos({ corteza: null, hoja: null, arbol: null, fruto: null })}
                >
                  Limpiar
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--primary"
                onClick={analizar}
                disabled={fotos.length === 0 || cargando}
              >
                {cargando ? "Analizando…" : "Analizar"}
              </button>
            </div>
          </div>
        </div>

        <div className="card card-pad result">
          <h3 className="result-title">Resultado del análisis</h3>
          {error ? <p className="alert alert--error">{error}</p> : null}

          <div aria-live="polite" aria-atomic="true">
            {cargando ? (
              <div className="result-skeleton" aria-label="Analizando imagen con IA…">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line--short" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line--short" />
              </div>
            ) : !resultado && !error ? (
              <p className="result-empty">
                Sube una imagen para evaluar el ejemplar y obtener los hospederos más probables, la
                confianza del modelo y notas de campo.
              </p>
            ) : resultado ? (
              <>
                <div className="result-verdict">
                  <span className={`badge ${resultado.esQuintral ? "badge--yes" : "badge--maybe"}`}>
                    {resultado.esQuintral ? "Es quintral" : "Sin certeza"}
                  </span>
                </div>

                <div className="result-options">
                  <p className="result-options-label">Hospederos más probables</p>
                  {resultado.opciones.map((opcion, index) => {
                    const pct = Math.round(opcion.confianza * 100);
                    const ordinal = index === 0 ? "1.°" : index === 1 ? "2.°" : `${index + 1}.°`;
                    return (
                      <div key={opcion.hospedero + index} className="result-option">
                        <div className="result-conf-head">
                          <span>
                            <strong>{ordinal}</strong> {etiquetaHospedero(opcion.hospedero)}
                          </span>
                          <strong>{pct}%</strong>
                        </div>
                        <div
                          className="meter"
                          role="meter"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Confianza en ${etiquetaHospedero(opcion.hospedero)}: ${pct}%`}
                        >
                          <span style={{ transform: `scaleX(${opcion.confianza})` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <dl className="result-data">
                  <div>
                    <dt>Fenología</dt>
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
          </div>

          {resultado || fotos.length > 0 ? (
            <button type="button" className="btn btn--forest result-cta" onClick={agregarAlMapa}>
              {resultado ? "Agregar al mapa" : "Agregar foto al mapa manualmente"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
