"use client";
import { useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import { fetchObservations } from "@/lib/observations";
import { useOfflineQueue } from "@/lib/offline/useOfflineQueue";
import IdentifySection from "@/components/IdentifySection";
import MapSection from "@/components/MapSection";
import CompararSection from "@/components/CompararSection";
import PrediccionSection from "@/components/PrediccionSection";
import FaqSection from "@/components/FaqSection";
import ContributeForm, { type Prefill } from "@/components/ContributeForm";
import PendingPanel from "@/components/PendingPanel";

export default function HomeClient() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const { pendientes, encolar, sincronizar, sincronizando } = useOfflineQueue((o) =>
    setObservations((prev) => [o, ...prev]),
  );

  useEffect(() => {
    fetchObservations().then(setObservations).catch(() => setObservations([]));
  }, []);

  return (
    <>
      <IdentifySection onPrefill={setPrefill} />
      <MapSection observations={observations} />
      <CompararSection />
      <PrediccionSection />
      <FaqSection />
      <ContributeForm prefill={prefill} onQueue={encolar} />
      <PendingPanel pendientes={pendientes} sincronizar={sincronizar} sincronizando={sincronizando} />
    </>
  );
}
