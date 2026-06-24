"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Host, Observation } from "@/lib/types";
import { HOSPEDEROS, etiquetaHospedero } from "@/lib/hosts";
import { filterObservations } from "@/lib/filterObservations";

const MapaQuintral = dynamic(() => import("@/components/MapaQuintral"), { ssr: false });

export default function MapSection({ observations }: { observations: Observation[] }) {
  const [cerro, setCerro] = useState<string | "todos">("todos");
  const [hospedero, setHospedero] = useState<Host | "todos">("todos");

  const cerros = useMemo(
    () => Array.from(new Set(observations.map((o) => o.cerro).filter(Boolean))) as string[],
    [observations],
  );
  const visibles = useMemo(
    () => filterObservations(observations, cerro, hospedero),
    [observations, cerro, hospedero],
  );

  return (
    <section id="mapa" style={{ padding: "2rem 1rem", maxWidth: 1000, margin: "0 auto" }}>
      <h2>Mapa georreferenciado de registros</h2>
      <div style={{ display: "flex", gap: "1rem", margin: "1rem 0", flexWrap: "wrap" }}>
        <label>
          Cerro:{" "}
          <select value={cerro} onChange={(e) => setCerro(e.target.value)}>
            <option value="todos">Todos</option>
            {cerros.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Hospedero:{" "}
          <select value={hospedero} onChange={(e) => setHospedero(e.target.value as Host | "todos")}>
            <option value="todos">Todos</option>
            {HOSPEDEROS.map((h) => (
              <option key={h} value={h}>{etiquetaHospedero(h)}</option>
            ))}
          </select>
        </label>
      </div>
      <MapaQuintral observations={visibles} />
    </section>
  );
}
