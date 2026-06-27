import type { AllowedImageType } from "@/lib/imageMime";

export type EtiquetaFoto = "corteza" | "hoja" | "arbol" | "fruto";

export interface ImagenEntrada {
  base64: string;
  mediaType: AllowedImageType;
  etiqueta?: EtiquetaFoto;
}

export const ETIQUETAS_FOTO: { id: EtiquetaFoto; titulo: string }[] = [
  { id: "corteza", titulo: "Corteza" },
  { id: "hoja", titulo: "Hoja (de cerca)" },
  { id: "arbol", titulo: "Árbol completo" },
  { id: "fruto", titulo: "Fruto o flor" },
];

export const ETIQUETAS_FOTO_TEXTO: Record<EtiquetaFoto, string> = {
  corteza: "Foto de la corteza del hospedero",
  hoja: "Foto de las hojas del hospedero",
  arbol: "Foto del árbol hospedero completo",
  fruto: "Foto del fruto o flor del hospedero",
};
