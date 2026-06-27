"use client";
import { useEffect, useState } from "react";
import { ETIQUETAS_FOTO, type EtiquetaFoto } from "@/lib/imagenes";

const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

export default function RanurasFotos({
  archivos,
  onCambio,
  error,
}: {
  archivos: Record<EtiquetaFoto, File | null>;
  onCambio: (etiqueta: EtiquetaFoto, file: File | null) => void;
  error?: (msg: string) => void;
}) {
  const [previas, setPrevias] = useState<Record<EtiquetaFoto, string | null>>({
    corteza: null,
    hoja: null,
    arbol: null,
    fruto: null,
  });

  useEffect(() => {
    return () => {
      Object.values(previas).forEach((u) => u && URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPrevias((current) => {
      const next = { ...current };
      for (const key of Object.keys(current) as EtiquetaFoto[]) {
        if (archivos[key] === null && current[key] !== null) {
          URL.revokeObjectURL(current[key]!);
          next[key] = null;
        }
      }
      return next;
    });
  }, [archivos]);

  function elegir(etiqueta: EtiquetaFoto, file: File | null) {
    if (file) {
      if (!TIPOS_PERMITIDOS.has(file.type)) {
        error?.("Solo se permiten imágenes JPG, PNG o WEBP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        error?.("La imagen es demasiado grande. Máximo 4 MB.");
        return;
      }
    }
    setPrevias((p) => {
      if (p[etiqueta]) URL.revokeObjectURL(p[etiqueta]!);
      return { ...p, [etiqueta]: file ? URL.createObjectURL(file) : null };
    });
    onCambio(etiqueta, file);
  }

  return (
    <div className="ranuras-fotos">
      {ETIQUETAS_FOTO.map((e) => (
        <div key={e.id} className="ranura">
          <span className="ranura-titulo">{e.titulo}</span>
          <label className="dropzone dropzone--mini">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={`Subir ${e.titulo}`}
              onChange={(ev) => elegir(e.id, ev.target.files?.[0] ?? null)}
              hidden
            />
            {previas[e.id] ? (
              <img src={previas[e.id]!} alt={`Vista previa ${e.titulo}`} className="dropzone-preview" />
            ) : (
              <span className="dropzone-empty">
                <small>Agregar</small>
              </span>
            )}
          </label>
          {archivos[e.id] ? (
            <button type="button" className="btn btn--ghost" onClick={() => elegir(e.id, null)}>
              Quitar
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
