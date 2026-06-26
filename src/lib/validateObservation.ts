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

export function validateObservation(form: FormState): string[] {
  const errores: string[] = [];
  if (!form.nombreObservador.trim()) errores.push("Falta el nombre del observador.");

  const lat = Number(form.lat);
  if (form.lat.trim() === "" || Number.isNaN(lat)) {
    errores.push("La latitud debe ser un número válido.");
  } else if (lat < -90 || lat > 90) {
    errores.push("La latitud debe estar entre -90 y 90.");
  }

  const lng = Number(form.lng);
  if (form.lng.trim() === "" || Number.isNaN(lng)) {
    errores.push("La longitud debe ser un número válido.");
  } else if (lng < -180 || lng > 180) {
    errores.push("La longitud debe estar entre -180 y 180.");
  }

  if (!form.fenologia.trim()) errores.push("Falta la fenología/estado del ejemplar.");
  if (form.hospedero === "otro" && !form.hospederoOtro.trim()) {
    errores.push("Indica el nombre del nuevo hospedero.");
  }

  if (form.altitud.trim() !== "") {
    const altitud = Number(form.altitud);
    if (!Number.isInteger(altitud)) errores.push("La altitud debe ser un entero.");
    else if (altitud < -500 || altitud > 10000) errores.push("La altitud está fuera de rango.");
  }

  return errores;
}
