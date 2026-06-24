"use client";
import { useState } from "react";
import type { IdentifyResult } from "@/lib/types";
import { etiquetaHospedero } from "@/lib/hosts";
import { fileToBase64 } from "@/lib/fileToBase64";
import { uploadFoto } from "@/lib/uploadFoto";
import type { Prefill } from "@/components/ContributeForm";

export default function IdentifySection({ onPrefill }: { onPrefill: (p: Prefill) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<IdentifyResult | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analizar() {
    if (!archivo) return;
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
    if (!resultado) return;
    onPrefill({
      hospedero: resultado.hospederoProbable,
      fenologia: resultado.fenologia,
      fotoUrl,
      resultadoIa: resultado,
    });
    document.getElementById("aportar")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="identificar" style={{ padding: "2rem 1rem", maxWidth: 1000, margin: "0 auto" }}>
      <h2>Identificación automática con IA</h2>
      <p>Sube una foto del ejemplar. El modelo estima especie, hospedero y fenología.</p>
      <input type="file" accept="image/*" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      <button onClick={analizar} disabled={!archivo || cargando}>
        {cargando ? "Analizando…" : "Analizar"}
      </button>
      {error && <p style={{ color: "#c0392b" }}>{error}</p>}
      {resultado && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>¿Es quintral?</strong> {resultado.esQuintral ? "Sí" : "No con certeza"}</p>
          <p><strong>Hospedero probable:</strong> {etiquetaHospedero(resultado.hospederoProbable)} ({Math.round(resultado.confianza * 100)}%)</p>
          <p><strong>Fenología:</strong> {resultado.fenologia || "—"}</p>
          <p>{resultado.notas}</p>
          {resultado.confianza < 0.5 && (
            <p style={{ color: "#c0392b" }}>Baja confianza: confirma el hospedero a mano en el formulario.</p>
          )}
          <button onClick={agregarAlMapa}>Agregar al mapa</button>
        </div>
      )}
    </section>
  );
}
