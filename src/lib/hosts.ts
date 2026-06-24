import type { Host } from "@/lib/types";

export const HOSPEDEROS: Host[] = ["aromo", "colliguay", "litre", "quillay", "otro"];

const COLORES: Record<Host, string> = {
  aromo: "#e0a106",
  colliguay: "#2e8b57",
  litre: "#8e44ad",
  quillay: "#c0392b",
  otro: "#7f8c8d",
};

export function colorHospedero(h: Host): string {
  return COLORES[h];
}

export function etiquetaHospedero(h: Host): string {
  return h.charAt(0).toUpperCase() + h.slice(1);
}
