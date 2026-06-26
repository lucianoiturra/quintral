import type { Observation } from "@/lib/types";
import { HOSPEDEROS } from "@/lib/hosts";
import { getSupabase } from "@/lib/supabase";
import type { ObservationInput } from "@/lib/observationPayload";

export interface ObservacionRow {
  id: string;
  nombre_observador: string;
  lat: number;
  lng: number;
  hospedero: string;
  hospedero_otro: string | null;
  fenologia: string;
  altitud: number | null;
  exposicion_solar: string | null;
  foto_url: string | null;
  resultado_ia: unknown;
  cerro: string | null;
  creado_en: string;
  oculta: boolean;
  verificada: boolean;
  notas_admin: string | null;
  editado_en: string | null;
}

export type NewObservation = ObservationInput;

export function mapRowToObservation(row: ObservacionRow): Observation {
  const hospedero = HOSPEDEROS.includes(row.hospedero as Observation["hospedero"])
    ? (row.hospedero as Observation["hospedero"])
    : "otro";
  return {
    id: row.id,
    nombreObservador: row.nombre_observador,
    lat: row.lat,
    lng: row.lng,
    hospedero,
    hospederoOtro: row.hospedero_otro,
    fenologia: row.fenologia,
    altitud: row.altitud,
    exposicionSolar: row.exposicion_solar,
    fotoUrl: row.foto_url,
    cerro: row.cerro,
    creadoEn: row.creado_en,
    oculta: row.oculta,
    verificada: row.verificada,
    notasAdmin: row.notas_admin,
    editadoEn: row.editado_en,
  };
}

export async function fetchObservations(): Promise<Observation[]> {
  const { data, error } = await getSupabase()
    .from("observaciones")
    .select("*")
    .eq("oculta", false)
    .order("creado_en", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ObservacionRow[]).map(mapRowToObservation);
}

export async function createObservation(input: NewObservation): Promise<Observation> {
  const res = await fetch("/api/observations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await res.json().catch(() => null)) as
    | ObservacionRow
    | { error?: string; errors?: string[] }
    | null;

  if (!res.ok) {
    if (payload && "errors" in payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
      throw new Error(payload.errors.join(" "));
    }

    throw new Error(
      payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Error al guardar la observacion.",
    );
  }

  if (!payload || !("id" in payload)) {
    throw new Error("No se recibio dato al crear la observacion");
  }

  return mapRowToObservation(payload);
}
