import type { Observation } from "@/lib/types";
import type { ObservationInput } from "@/lib/observationPayload";
import type { PendingObservation } from "@/lib/offline/types";
import { listPending, updatePending, removePending } from "@/lib/offline/db";
import { fetchElevation } from "@/lib/elevation";
import { uploadFoto } from "@/lib/uploadFoto";
import { createObservation } from "@/lib/observations";

export interface SyncDeps {
  listPending: () => Promise<PendingObservation[]>;
  updatePending: (id: string, patch: Partial<PendingObservation>) => Promise<void>;
  removePending: (id: string) => Promise<void>;
  uploadFoto: (file: File) => Promise<string>;
  fetchElevation: (lat: number, lng: number) => Promise<number | null>;
  createObservation: (input: ObservationInput) => Promise<Observation>;
}

export interface SyncResult {
  subidas: Observation[];
  errores: number;
}

export async function syncPending(deps: SyncDeps): Promise<SyncResult> {
  const pendientes = await deps.listPending();
  const subidas: Observation[] = [];
  let errores = 0;

  for (const p of pendientes) {
    try {
      await deps.updatePending(p.id, { estado: "subiendo", error: null });

      const fotoUrl = p.fotoBlob
        ? await deps.uploadFoto(new File([p.fotoBlob], "foto.jpg", { type: p.fotoBlob.type || "image/jpeg" }))
        : null;

      const elevacion = await deps.fetchElevation(p.payload.lat, p.payload.lng);
      const altitudRaw = elevacion ?? p.altitudGps;
      const altitud = altitudRaw !== null ? Math.round(altitudRaw) : null;

      const obs = await deps.createObservation({ ...p.payload, fotoUrl, altitud });
      await deps.removePending(p.id);
      subidas.push(obs);
    } catch (err) {
      errores += 1;
      await deps.updatePending(p.id, {
        estado: "error",
        error: err instanceof Error ? err.message : "Error al subir.",
      });
    }
  }

  return { subidas, errores };
}

export function runSync(): Promise<SyncResult> {
  return syncPending({ listPending, updatePending, removePending, uploadFoto, fetchElevation, createObservation });
}
