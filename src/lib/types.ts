export type Host =
  | "alamo"
  | "aromo"
  | "arrayan"
  | "barraco"
  | "boldo"
  | "chacay"
  | "coihue"
  | "colliguay"
  | "corcolen"
  | "crucero"
  | "eulychnia-breviflora"
  | "eulychnia-castanea"
  | "huingan"
  | "litre"
  | "maqui"
  | "maiten"
  | "manzano"
  | "nothofagus-nitida"
  | "olivo"
  | "peral"
  | "peumo"
  | "pingo-pingo"
  | "platano-oriental"
  | "quillay"
  | "quisco"
  | "quisco-coquimbano"
  | "quisco-litoralis"
  | "quisco-skottsbergii"
  | "quisquito"
  | "sauce"
  | "otro";

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
  oculta: boolean;
  verificada: boolean;
  notasAdmin: string | null;
  editadoEn: string | null;
}

export interface IdentifyOption {
  hospedero: Host;
  confianza: number; // 0..1
}

export interface IdentifyResult {
  esQuintral: boolean;
  opciones: [IdentifyOption, IdentifyOption]; // top 2, mayor confianza primero
  fenologia: string;
  notas: string;
}
