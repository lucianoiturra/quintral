"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  // Evita que dos sincronizaciones se solapen y suban el mismo pendiente
  // varias veces (causa histórica de registros duplicados).
  const enCursoRef = useRef(false);

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
    if (enCursoRef.current) return;
    enCursoRef.current = true;
    setSincronizando(true);
    try {
      const res = await runSync();
      res.subidas.forEach((obs) => onSynced(obs));
      await refrescar();
    } finally {
      enCursoRef.current = false;
      setSincronizando(false);
    }
  }, [onSynced, refrescar]);

  // Solo al montar y cuando vuelve la conexión; no debe re-ejecutarse en cada
  // render (por eso `sincronizar` lleva su propio guardia de reentrada).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pendientes, encolar, sincronizar, sincronizando };
}
