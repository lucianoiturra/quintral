import type { ObservationInput } from "@/lib/observationPayload";

/** Campos del registro que se conocen en terreno (sin foto ni altitud final). */
export type PendingPayload = Omit<ObservationInput, "fotoUrl" | "altitud">;

export type EstadoPendiente = "pendiente" | "subiendo" | "error";

export interface PendingObservation {
  id: string;
  payload: PendingPayload;
  fotoBlob: Blob | null;
  altitudGps: number | null;
  precision: number | null;
  estado: EstadoPendiente;
  error: string | null;
  creadoEn: number;
}
