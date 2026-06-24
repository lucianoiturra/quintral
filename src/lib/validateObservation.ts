import type { Host } from "@/lib/types";

export interface FormState {
  nombreObservador: string;
  lat: string;
  lng: string;
  hospedero: Host;
  hospederoOtro: string;
  fenologia: string;
  altitud: string;
  exposicionSolar: string;
  cerro: string;
}

export function validateObservation(f: FormState): string[] {
  const errores: string[] = [];
  if (!f.nombreObservador.trim()) errores.push("Falta el nombre del observador.");

  const lat = Number(f.lat);
  if (f.lat.trim() === "" || Number.isNaN(lat)) errores.push("La latitud debe ser un número válido.");
  else if (lat < -90 || lat > 90) errores.push("La latitud debe estar entre -90 y 90.");

  const lng = Number(f.lng);
  if (f.lng.trim() === "" || Number.isNaN(lng)) errores.push("La longitud debe ser un número válido.");
  else if (lng < -180 || lng > 180) errores.push("La longitud debe estar entre -180 y 180.");

  if (!f.fenologia.trim()) errores.push("Falta la fenología/estado del ejemplar.");
  if (f.hospedero === "otro" && !f.hospederoOtro.trim())
    errores.push("Indica el nombre del nuevo hospedero.");

  return errores;
}
