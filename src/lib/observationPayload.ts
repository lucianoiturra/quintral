import { HOSPEDEROS } from "@/lib/hosts";
import { isSafePhotoUrl } from "@/lib/photoUrl";
import type { Host } from "@/lib/types";

export interface ObservationInput {
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

function compactText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isJsonValue(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

export function normalizeObservationInput(raw: unknown): {
  value: ObservationInput | null;
  errors: string[];
} {
  const input = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errors: string[] = [];

  const nombreObservador = compactText(input.nombreObservador as string);
  if (!nombreObservador) errors.push("Falta el nombre del observador.");
  else if (nombreObservador.length > 80) errors.push("El nombre del observador es demasiado largo.");

  const lat = typeof input.lat === "number" ? input.lat : Number(input.lat);
  if (!Number.isFinite(lat)) errors.push("La latitud debe ser un numero valido.");
  else if (lat < -90 || lat > 90) errors.push("La latitud debe estar entre -90 y 90.");

  const lng = typeof input.lng === "number" ? input.lng : Number(input.lng);
  if (!Number.isFinite(lng)) errors.push("La longitud debe ser un numero valido.");
  else if (lng < -180 || lng > 180) errors.push("La longitud debe estar entre -180 y 180.");

  const hospedero = input.hospedero;
  if (!HOSPEDEROS.includes(hospedero as Host)) {
    errors.push("El hospedero no es valido.");
  }

  const fenologia = compactText(input.fenologia as string);
  if (!fenologia) errors.push("Falta la fenologia/estado del ejemplar.");
  else if (fenologia.length > 120) errors.push("La fenologia es demasiado larga.");

  const hospederoOtro = compactText(input.hospederoOtro as string);
  if (hospedero === "otro") {
    if (!hospederoOtro) errors.push("Indica el nombre del nuevo hospedero.");
    else if (hospederoOtro.length > 120) errors.push("El nuevo hospedero es demasiado largo.");
  }

  const altitudRaw = input.altitud;
  const altitud =
    altitudRaw === null || altitudRaw === undefined || altitudRaw === ""
      ? null
      : Number(altitudRaw);
  if (altitud !== null) {
    if (!Number.isInteger(altitud)) errors.push("La altitud debe ser un entero.");
    else if (altitud < -500 || altitud > 10000) errors.push("La altitud esta fuera de rango.");
  }

  const exposicionSolar = compactText(input.exposicionSolar as string);
  if (exposicionSolar && exposicionSolar.length > 80) {
    errors.push("La exposicion solar es demasiado larga.");
  }

  const cerro = compactText(input.cerro as string);
  if (cerro && cerro.length > 120) errors.push("El nombre del cerro es demasiado largo.");

  const fotoUrl = compactText(input.fotoUrl as string);
  if (fotoUrl && !isSafePhotoUrl(fotoUrl)) {
    errors.push("La URL de la foto no pertenece al bucket permitido.");
  }

  const resultadoIa = input.resultadoIa ?? null;
  if (!isJsonValue(resultadoIa)) {
    errors.push("El resultado de IA debe ser un JSON valido.");
  }

  if (errors.length > 0) return { value: null, errors };

  return {
    value: {
      nombreObservador: nombreObservador!,
      lat,
      lng,
      hospedero: hospedero as Host,
      hospederoOtro: hospedero === "otro" ? hospederoOtro : null,
      fenologia: fenologia!,
      altitud,
      exposicionSolar,
      fotoUrl,
      resultadoIa,
      cerro,
    },
    errors,
  };
}
