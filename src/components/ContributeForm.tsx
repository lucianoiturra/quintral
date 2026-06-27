"use client";
import { useEffect, useState } from "react";
import type { Host } from "@/lib/types";
import { HOSPEDEROS, etiquetaHospedero } from "@/lib/hosts";
import { validateObservation, type FormState } from "@/lib/validateObservation";
import type { PendingPayload } from "@/lib/offline/types";
import PrepOffline from "@/components/PrepOffline";

export interface Prefill extends Partial<FormState> {
  fotoUrl?: string | null;
  fotoArchivo?: File | null;
  resultadoIa?: unknown;
}

const VACIO: FormState = {
  nombreObservador: "", lat: "", lng: "", hospedero: "quillay",
  hospederoOtro: "", fenologia: "", altitud: "", exposicionSolar: "", cerro: "",
};

function mergePrefillIntoForm(current: FormState, prefill: Prefill): FormState {
  const {
    nombreObservador,
    lat,
    lng,
    hospedero,
    hospederoOtro,
    fenologia,
    altitud,
    exposicionSolar,
    cerro,
  } = prefill;

  return {
    ...current,
    ...(nombreObservador !== undefined ? { nombreObservador } : {}),
    ...(lat !== undefined ? { lat } : {}),
    ...(lng !== undefined ? { lng } : {}),
    ...(hospedero !== undefined ? { hospedero } : {}),
    ...(hospederoOtro !== undefined ? { hospederoOtro } : {}),
    ...(fenologia !== undefined ? { fenologia } : {}),
    ...(altitud !== undefined ? { altitud } : {}),
    ...(exposicionSolar !== undefined ? { exposicionSolar } : {}),
    ...(cerro !== undefined ? { cerro } : {}),
  };
}

export default function ContributeForm({
  prefill,
  onQueue,
}: {
  prefill: Prefill | null;
  onQueue: (entrada: {
    payload: PendingPayload;
    fotoBlob: Blob | null;
    altitudGps: number | null;
    precision: number | null;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(VACIO);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [resultadoIa, setResultadoIa] = useState<unknown>(null);
  const [altitudGps, setAltitudGps] = useState<number | null>(null);
  const [precision, setPrecision] = useState<number | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setOk(false);
    setForm((f) => mergePrefillIntoForm(f, prefill));
    setFotoUrl(prefill.fotoUrl ?? null);
    setFotoArchivo(prefill.fotoArchivo ?? null);
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
        if (typeof pos.coords.altitude === "number" && Number.isFinite(pos.coords.altitude)) {
          const alt = Math.round(pos.coords.altitude);
          setAltitudGps(alt);
          set("altitud", String(alt));
        }
        setPrecision(typeof pos.coords.accuracy === "number" ? Math.round(pos.coords.accuracy) : null);
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
      const payload: PendingPayload = {
        nombreObservador: form.nombreObservador.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        hospedero: form.hospedero,
        hospederoOtro: form.hospedero === "otro" ? form.hospederoOtro.trim() : null,
        fenologia: form.fenologia.trim(),
        exposicionSolar: form.exposicionSolar.trim() || null,
        resultadoIa,
        cerro: form.cerro.trim() || null,
      };
      await onQueue({
        payload,
        fotoBlob: fotoArchivo,
        altitudGps: form.altitud.trim() ? Number(form.altitud) : altitudGps,
        precision,
      });
      setOk(true);
      setForm(VACIO);
      setFotoUrl(null);
      setFotoArchivo(null);
      setResultadoIa(null);
      setAltitudGps(null);
      setPrecision(null);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : "Error al guardar el registro."]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section id="aportar" className="section">
      <div className="section-head">
        <p className="kicker" data-num="05">Ciencia ciudadana</p>
        <h2>Aporta tus propias observaciones</h2>
        <p>
          Tus registros enriquecen el monitoreo del quintral. Cada observación
          valida y amplía el modelo y el mapa.
        </p>
      </div>

      <div className="contribute-grid">
        <form className="card card-pad contribute-form" onSubmit={enviar}>
          <PrepOffline />
          {(fotoUrl || fotoArchivo) && (
            <p className="contribute-attached">
              <span className="dot" style={{ background: "var(--forest-bright)" }} />
              Foto adjunta desde la identificación
            </p>
          )}

          <label className="field">
            <span>Observador</span>
            <input
              placeholder="Tu nombre"
              value={form.nombreObservador}
              onChange={(e) => set("nombreObservador", e.target.value)}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Latitud</span>
              <input placeholder="-33.21" value={form.lat} onChange={(e) => set("lat", e.target.value)} />
            </label>
            <label className="field">
              <span>Longitud</span>
              <input placeholder="-70.34" value={form.lng} onChange={(e) => set("lng", e.target.value)} />
            </label>
            <button type="button" className="btn btn--ghost field-gps" onClick={usarUbicacion}>
              Usar mi ubicación
            </button>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Hospedero</span>
              <select value={form.hospedero} onChange={(e) => set("hospedero", e.target.value as Host)}>
                {HOSPEDEROS.map((h) => (
                  <option key={h} value={h}>{etiquetaHospedero(h)}</option>
                ))}
              </select>
            </label>
            {form.hospedero === "otro" && (
              <label className="field">
                <span>Nuevo hospedero</span>
                <input
                  placeholder="Especie observada"
                  value={form.hospederoOtro}
                  onChange={(e) => set("hospederoOtro", e.target.value)}
                />
              </label>
            )}
          </div>

          <div className="field-row">
            <label className="field">
              <span>Fenología / estado</span>
              <input
                placeholder="Floración, fruto…"
                value={form.fenologia}
                onChange={(e) => set("fenologia", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Cerro (opcional)</span>
              <input placeholder="Manquehue…" value={form.cerro} onChange={(e) => set("cerro", e.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Altitud (m, opcional)</span>
              <input placeholder="1200" value={form.altitud} onChange={(e) => set("altitud", e.target.value)} />
            </label>
            <label className="field">
              <span>Exposición solar (opcional)</span>
              <input
                placeholder="Norte, sur…"
                value={form.exposicionSolar}
                onChange={(e) => set("exposicionSolar", e.target.value)}
              />
            </label>
          </div>

          {errores.length > 0 && (
            <ul className="error-list">{errores.map((er) => <li key={er}>{er}</li>)}</ul>
          )}
          {ok && (
            <p className="alert alert--ok">
              ✓ Guardado en tu teléfono. Sin señal se subirá al volver la conexión.
            </p>
          )}

          <button type="submit" className="btn btn--primary contribute-submit" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar observación"}
          </button>
        </form>

        <aside className="observer-panel">
          <h3>Red de observadores</h3>
          <p>
            La ciencia ciudadana permite detectar nuevos hospederos del quintral
            en el bosque esclerófilo de Chile central. Tus registros ayudan a
            entender cómo cambia su distribución entre cerros y a lo largo del año.
          </p>
          <ul className="observer-list">
            <li>Fotografía clara del ejemplar y del hospedero.</li>
            <li>Coordenadas GPS o ubicación en el terreno.</li>
            <li>Estado fenológico: floración, fruto, decaimiento.</li>
            <li>Cualquier hospedero no documentado antes.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
