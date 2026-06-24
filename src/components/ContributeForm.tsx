"use client";
import { useEffect, useState } from "react";
import type { Host, Observation } from "@/lib/types";
import { HOSPEDEROS, etiquetaHospedero } from "@/lib/hosts";
import { validateObservation, type FormState } from "@/lib/validateObservation";
import { createObservation } from "@/lib/observations";

export interface Prefill extends Partial<FormState> {
  fotoUrl?: string | null;
  resultadoIa?: unknown;
}

const VACIO: FormState = {
  nombreObservador: "", lat: "", lng: "", hospedero: "quillay",
  hospederoOtro: "", fenologia: "", altitud: "", exposicionSolar: "", cerro: "",
};

export default function ContributeForm({
  prefill,
  onCreated,
}: {
  prefill: Prefill | null;
  onCreated: (o: Observation) => void;
}) {
  const [form, setForm] = useState<FormState>(VACIO);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [resultadoIa, setResultadoIa] = useState<unknown>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setOk(false);
    setForm((f) => ({ ...f, ...prefill }) as FormState);
    setFotoUrl(prefill.fotoUrl ?? null);
    setResultadoIa(prefill.resultadoIa ?? null);
  }, [prefill]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function usarUbicacion() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        set("lat", String(pos.coords.latitude));
        set("lng", String(pos.coords.longitude));
      },
      () => setErrores((prev) => [...prev, "No se pudo obtener la ubicación; ingrésala manualmente."]),
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOk(false);
    const errs = validateObservation(form);
    setErrores(errs);
    if (errs.length) return;
    setEnviando(true);
    try {
      const o = await createObservation({
        nombreObservador: form.nombreObservador.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        hospedero: form.hospedero,
        hospederoOtro: form.hospedero === "otro" ? form.hospederoOtro.trim() : null,
        fenologia: form.fenologia.trim(),
        altitud: form.altitud.trim() ? Number(form.altitud) : null,
        exposicionSolar: form.exposicionSolar.trim() || null,
        fotoUrl,
        resultadoIa,
        cerro: form.cerro.trim() || null,
      });
      onCreated(o);
      setOk(true);
      setForm(VACIO);
      setFotoUrl(null);
      setResultadoIa(null);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : "Error al guardar el registro."]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section id="aportar" style={{ padding: "2rem 1rem", maxWidth: 1000, margin: "0 auto" }}>
      <h2>Aporta tus propias observaciones</h2>
      <form onSubmit={enviar} style={{ display: "grid", gap: ".75rem", maxWidth: 520 }}>
        <input placeholder="Tu nombre" value={form.nombreObservador}
          onChange={(e) => set("nombreObservador", e.target.value)} />
        <div style={{ display: "flex", gap: ".5rem" }}>
          <input placeholder="Latitud" value={form.lat} onChange={(e) => set("lat", e.target.value)} />
          <input placeholder="Longitud" value={form.lng} onChange={(e) => set("lng", e.target.value)} />
          <button type="button" onClick={usarUbicacion}>Usar mi ubicación</button>
        </div>
        <select value={form.hospedero} onChange={(e) => set("hospedero", e.target.value as Host)}>
          {HOSPEDEROS.map((h) => (
            <option key={h} value={h}>{etiquetaHospedero(h)}</option>
          ))}
        </select>
        {form.hospedero === "otro" && (
          <input placeholder="Nuevo hospedero" value={form.hospederoOtro}
            onChange={(e) => set("hospederoOtro", e.target.value)} />
        )}
        <input placeholder="Fenología / estado" value={form.fenologia}
          onChange={(e) => set("fenologia", e.target.value)} />
        <input placeholder="Altitud (m, opcional)" value={form.altitud}
          onChange={(e) => set("altitud", e.target.value)} />
        <input placeholder="Exposición solar (opcional)" value={form.exposicionSolar}
          onChange={(e) => set("exposicionSolar", e.target.value)} />
        <input placeholder="Cerro (opcional)" value={form.cerro}
          onChange={(e) => set("cerro", e.target.value)} />
        {errores.length > 0 && (
          <ul style={{ color: "#c0392b" }}>{errores.map((er) => <li key={er}>{er}</li>)}</ul>
        )}
        {ok && <p style={{ color: "#1f3d2b" }}>¡Registro agregado al mapa!</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar observación"}
        </button>
      </form>
    </section>
  );
}
