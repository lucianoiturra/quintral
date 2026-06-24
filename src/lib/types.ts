export type Host = "aromo" | "colliguay" | "litre" | "quillay" | "otro";

export interface Observation {
  id: string;
  nombreObservador: string;
  lat: number;
  lng: number;
  hospedero: Host;
  hospederoOtro: string | null;
  fenologia: string;
  altitud: number | null;
  exposicionSolar: string | null;
  fotoUrl: string | null;
  cerro: string | null;
  creadoEn: string;
}

export interface IdentifyResult {
  esQuintral: boolean;
  hospederoProbable: Host;
  confianza: number; // 0..1
  fenologia: string;
  notas: string;
}
