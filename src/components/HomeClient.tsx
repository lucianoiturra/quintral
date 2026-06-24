"use client";
import { useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import { fetchObservations } from "@/lib/observations";
import IdentifySection from "@/components/IdentifySection";
import MapSection from "@/components/MapSection";
import ContributeForm, { type Prefill } from "@/components/ContributeForm";

export default function HomeClient() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  useEffect(() => {
    fetchObservations().then(setObservations).catch(() => setObservations([]));
  }, []);

  return (
    <>
      <IdentifySection onPrefill={setPrefill} />
      <MapSection observations={observations} />
      <ContributeForm
        prefill={prefill}
        onCreated={(o) => setObservations((prev) => [o, ...prev])}
      />
    </>
  );
}
