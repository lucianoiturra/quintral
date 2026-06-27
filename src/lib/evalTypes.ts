import type { Host } from "@/lib/types";

export interface ManifestItem {
  archivo: string;
  hospedero: Host;
  fuente: string;
  lat?: number;
  lng?: number;
}

export interface ManifestMultiItem {
  archivos: string[];
  hospedero: Host;
  fuente: string;
  lat?: number;
  lng?: number;
}

export interface ManifestMulti {
  generadoEl: string;
  items: ManifestMultiItem[];
}
