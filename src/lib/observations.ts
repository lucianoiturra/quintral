import type { Host, Observation } from "@/lib/types";
import { HOSPEDEROS } from "@/lib/hosts";
import { getSupabase } from "@/lib/supabase";

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
}

export interface NewObservation {
  nombreObservador: string;
  lat: number;
  lng: number;
  hospedero: Host;
  hospederoOtro: string | null;
  fenologia: string;
  altitud: number | null;
  exposicionSolar: string | null;
  fotoUrl: string | null;
  resultadoIa: unknown;
  cerro: string | null;
}

export function mapRowToObservation(row: ObservacionRow): Observation {
  const hospedero = HOSPEDEROS.includes(row.hospedero as Host)
    ? (row.hospedero as Host)
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
  };
}

export async function fetchObservations(): Promise<Observation[]> {
  const { data, error } = await getSupabase()
    .from("observaciones")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ObservacionRow[]).map(mapRowToObservation);
}

export async function createObservation(input: NewObservation): Promise<Observation> {
  const { data, error } = await getSupabase()
    .from("observaciones")
    .insert({
      nombre_observador: input.nombreObservador,
      lat: input.lat,
      lng: input.lng,
      hospedero: input.hospedero,
      hospedero_otro: input.hospederoOtro,
      fenologia: input.fenologia,
      altitud: input.altitud,
      exposicion_solar: input.exposicionSolar,
      foto_url: input.fotoUrl,
      resultado_ia: input.resultadoIa,
      cerro: input.cerro,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRowToObservation(data as ObservacionRow);
}
