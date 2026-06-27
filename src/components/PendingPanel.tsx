"use client";
import type { PendingObservation } from "@/lib/offline/types";

const ETIQUETA: Record<PendingObservation["estado"], string> = {
  pendiente: "Pendiente de subir",
  subiendo: "Subiendo…",
  error: "Error, se reintentará",
};

export default function PendingPanel({
  pendientes,
  sincronizar,
  sincronizando,
}: {
  pendientes: PendingObservation[];
  sincronizar: () => Promise<void>;
  sincronizando: boolean;
}) {
  if (pendientes.length === 0) return null;
  return (
    <div className="pending-panel card card-pad" role="status" aria-live="polite">
      <div className="pending-head">
        <strong>Pendientes de subir: {pendientes.length}</strong>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => void sincronizar()}
          disabled={sincronizando}
        >
          {sincronizando ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
      </div>
      <ul className="pending-list">
        {pendientes.map((p) => (
          <li key={p.id}>
            <span>{p.payload.cerro || p.payload.nombreObservador || "Observación"}</span>
            <span className={`pending-state pending-state--${p.estado}`}>{ETIQUETA[p.estado]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
