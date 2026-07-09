"use client";
import { useCallback, useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import { fetchObservations } from "@/lib/observations";
import { useOfflineQueue } from "@/lib/offline/useOfflineQueue";
import IdentifySection from "@/components/IdentifySection";
import MapSection from "@/components/MapSection";
import CompararSection from "@/components/CompararSection";
import AntibacterianoSection from "@/components/AntibacterianoSection";
import FaqSection from "@/components/FaqSection";
import ContributeForm, { type Prefill } from "@/components/ContributeForm";
import PendingPanel from "@/components/PendingPanel";

export default function HomeClient() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const onSynced = useCallback(
    (o: Observation) => setObservations((prev) => [o, ...prev]),
    [],
  );
  const { pendientes, encolar, sincronizar, sincronizando } = useOfflineQueue(onSynced);

  useEffect(() => {
    fetchObservations().then(setObservations).catch(() => setObservations([]));
  }, []);

  return (
    <>
      <IdentifySection onPrefill={setPrefill} />
      <MapSection observations={observations} />
      <ContributeForm prefill={prefill} onQueue={encolar} />
      <PendingPanel pendientes={pendientes} sincronizar={sincronizar} sincronizando={sincronizando} />
      <CompararSection />
      <AntibacterianoSection />
      <FaqSection />
    </>
  );
}
