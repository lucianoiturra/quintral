"use client";
import { useCallback, useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import type { PendingObservation, PendingPayload } from "@/lib/offline/types";
import { addPending, listPending } from "@/lib/offline/db";
import { runSync } from "@/lib/offline/sync";

type Entrada = {
  payload: PendingPayload;
  fotoBlob: Blob | null;
  altitudGps: number | null;
  precision: number | null;
};

export function useOfflineQueue(onSynced: (obs: Observation) => void) {
  const [pendientes, setPendientes] = useState<PendingObservation[]>([]);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescar = useCallback(async () => {
    setPendientes(await listPending());
  }, []);

  const encolar = useCallback(
    async (entrada: Entrada) => {
      await addPending(entrada);
      await refrescar();
    },
    [refrescar],
  );

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const res = await runSync();
      res.subidas.forEach((obs) => onSynced(obs));
      await refrescar();
    } finally {
      setSincronizando(false);
    }
  }, [onSynced, refrescar]);

  useEffect(() => {
    const tid = setTimeout(() => {
      void refrescar();
      if (navigator.onLine) void sincronizar();
    }, 0);
    const onOnline = () => void sincronizar();
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(tid);
      window.removeEventListener("online", onOnline);
    };
  }, [refrescar, sincronizar]);

  return { pendientes, encolar, sincronizar, sincronizando };
}
