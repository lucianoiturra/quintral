import type { Host } from "@/lib/types";

export const HOSPEDEROS: Host[] = [
  "alamo", "aromo", "arrayan", "barraco", "boldo",
  "chacay", "coihue", "colliguay", "corcolen", "crucero",
  "eulychnia-breviflora", "eulychnia-castanea",
  "huingan", "litre", "maqui", "maiten", "manzano",
  "nothofagus-nitida", "olivo", "peral", "peumo",
  "pingo-pingo", "platano-oriental", "quillay",
  "quisco", "quisco-coquimbano", "quisco-litoralis", "quisco-skottsbergii",
  "quisquito", "sauce", "otro",
];

const ETIQUETAS: Record<Host, string> = {
  alamo: "Álamo",
  aromo: "Aromo",
  arrayan: "Arrayán",
  barraco: "Barraco",
  boldo: "Boldo",
  chacay: "Chacay",
  coihue: "Coihue",
  colliguay: "Colliguay",
  corcolen: "Corcolén",
  crucero: "Crucero",
  "eulychnia-breviflora": "Eulychnia breviflora",
  "eulychnia-castanea": "Eulychnia castanea",
  huingan: "Huingán",
  litre: "Litre",
  maqui: "Maqui",
  maiten: "Maitén",
  manzano: "Manzano",
  "nothofagus-nitida": "Nothofagus nitida",
  olivo: "Olivo",
  peral: "Peral",
  peumo: "Peumo",
  "pingo-pingo": "Pingo-pingo",
  "platano-oriental": "Plátano oriental",
  quillay: "Quillay",
  quisco: "Quisco",
  "quisco-coquimbano": "Quisco coquimbano",
  "quisco-litoralis": "Quisco litoralis",
  "quisco-skottsbergii": "Quisco skottsbergii",
  quisquito: "Quisquito",
  sauce: "Sauce",
  otro: "Otro",
};

const COLORES: Record<Host, string> = {
  // nativas matorral
  aromo: "#e0a106",
  arrayan: "#1a7a4a",
  boldo: "#4a9e6b",
  chacay: "#5c7a3e",
  colliguay: "#2e8b57",
  corcolen: "#6b8e4e",
  crucero: "#8b7355",
  huingan: "#d4880f",
  litre: "#8e44ad",
  maqui: "#7b2d8b",
  maiten: "#27ae60",
  peumo: "#c0784a",
  quillay: "#c0392b",
  // bosque sur
  coihue: "#2d5a1b",
  "nothofagus-nitida": "#1e5c12",
  barraco: "#9b59b6",
  // cactáceas
  "eulychnia-breviflora": "#d4a017",
  "eulychnia-castanea": "#b8860b",
  "pingo-pingo": "#a04000",
  quisco: "#e67e22",
  "quisco-coquimbano": "#d35400",
  "quisco-litoralis": "#f39c12",
  "quisco-skottsbergii": "#ca6f1e",
  quisquito: "#dc7633",
  // introducidas
  alamo: "#5d8aa8",
  manzano: "#e84393",
  olivo: "#808000",
  peral: "#b8b400",
  "platano-oriental": "#6b8cba",
  sauce: "#708090",
  otro: "#7f8c8d",
};

export function colorHospedero(h: Host): string {
  return COLORES[h];
}

export function etiquetaHospedero(h: Host): string {
  return ETIQUETAS[h];
}
