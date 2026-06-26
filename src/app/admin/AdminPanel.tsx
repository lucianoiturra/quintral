"use client";

import { useEffect, useMemo, useState } from "react";
import { etiquetaHospedero, HOSPEDEROS } from "@/lib/hosts";
import type { Host, Observation } from "@/lib/types";

type AdminLogEntry = {
  id: string;
  observacion_id: string | null;
  accion: string;
  detalle: unknown;
  fecha: string;
};

type Filter = "todas" | "ocultas" | "verificadas";

type EditForm = {
  hospedero: Host;
  fenologia: string;
  cerro: string;
  altitud: string;
  exposicionSolar: string;
  notasAdmin: string;
};

function toEditForm(observation: Observation): EditForm {
  return {
    hospedero: observation.hospedero,
    fenologia: observation.fenologia,
    cerro: observation.cerro ?? "",
    altitud: observation.altitud == null ? "" : String(observation.altitud),
    exposicionSolar: observation.exposicionSolar ?? "",
    notasAdmin: observation.notasAdmin ?? "",
  };
}

export default function AdminPanel() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [logEntries, setLogEntries] = useState<AdminLogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("todas");
  const [hospederoFiltro, setHospederoFiltro] = useState<string>("todos");
  const [cerroFiltro, setCerroFiltro] = useState<string>("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const [obsResponse, logResponse] = await Promise.all([
        fetch("/api/admin/observaciones"),
        fetch("/api/admin/log"),
      ]);

      if (!active) return;

      if (!obsResponse.ok || !logResponse.ok) {
        setError("No se pudo cargar el panel admin.");
        setLoading(false);
        return;
      }

      const [obsData, logData] = await Promise.all([obsResponse.json(), logResponse.json()]);
      if (!active) return;

      setObservations(obsData as Observation[]);
      setLogEntries(logData as AdminLogEntry[]);
      setLoading(false);
    }

    load().catch(() => {
      if (!active) return;
      setError("No se pudo cargar el panel admin.");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  async function patchObservation(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/observaciones/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      setError("No se pudo actualizar la observacion.");
      return null;
    }

    const updated = (await response.json()) as Observation;
    setObservations((current) => current.map((item) => (item.id === id ? updated : item)));
    return updated;
  }

  async function toggleOculta(id: string) {
    const updated = await patchObservation(id, { action: "toggle_oculta" });
    if (updated) {
      prependLog(id, updated.oculta ? "ocultada" : "mostrada");
    }
  }

  async function toggleVerificada(id: string) {
    const updated = await patchObservation(id, { action: "toggle_verificada" });
    if (updated) {
      prependLog(id, updated.verificada ? "verificada" : "desverificada");
    }
  }

  async function saveEdit(id: string) {
    if (!editForm) return;

    const updated = await patchObservation(id, {
      action: "edit",
      fields: {
        hospedero: editForm.hospedero,
        fenologia: editForm.fenologia,
        cerro: editForm.cerro || null,
        altitud: editForm.altitud ? Number(editForm.altitud) : null,
        exposicion_solar: editForm.exposicionSolar || null,
        notas_admin: editForm.notasAdmin || null,
      },
    });

    if (updated) {
      setEditingId(null);
      setEditForm(null);
      prependLog(id, "editada");
    }
  }

  async function deleteObservation(id: string) {
    const response = await fetch(`/api/admin/observaciones/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo borrar la observacion.");
      return;
    }

    setObservations((current) => current.filter((item) => item.id !== id));
    setPendingDeleteId(null);
    prependLog(id, "borrada");
  }

  function prependLog(observacionId: string | null, accion: string) {
    setLogEntries((current) => [
      {
        id: crypto.randomUUID(),
        observacion_id: observacionId,
        accion,
        detalle: null,
        fecha: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  const cerros = useMemo(
    () => Array.from(new Set(observations.map((observation) => observation.cerro).filter(Boolean))) as string[],
    [observations],
  );

  const visibles = observations.filter((observation) => {
    if (filter === "ocultas" && !observation.oculta) return false;
    if (filter === "verificadas" && !observation.verificada) return false;
    if (hospederoFiltro !== "todos" && observation.hospedero !== hospederoFiltro) return false;
    if (cerroFiltro !== "todos" && observation.cerro !== cerroFiltro) return false;
    return true;
  });

  return (
    <main className="section" style={{ paddingTop: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "end",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div className="section-head" style={{ marginBottom: 0 }}>
          <span className="kicker">Moderacion</span>
          <h1 style={{ fontSize: "clamp(2rem, 1.5rem + 2vw, 3rem)" }}>Quintral Admin</h1>
          <p style={{ marginTop: "0.7rem" }}>
            Revisa aportes, oculta ruido, confirma registros confiables y deja trazabilidad.
          </p>
        </div>
        <button className="btn btn--ghost" onClick={logout}>
          Cerrar sesion
        </button>
      </div>

      {error ? <p className="alert alert--error">{error}</p> : null}

      <section className="card card-pad rise" style={{ display: "grid", gap: "1rem" }}>
        <div className="pill-row">
          {(["todas", "ocultas", "verificadas"] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              className="pill"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              style={{ textTransform: "capitalize" }}
            >
              {item}
            </button>
          ))}
          <select value={hospederoFiltro} onChange={(event) => setHospederoFiltro(event.target.value)}>
            <option value="todos">Hospedero: todos</option>
            {HOSPEDEROS.map((host) => (
              <option key={host} value={host}>
                {etiquetaHospedero(host)}
              </option>
            ))}
          </select>
          <select value={cerroFiltro} onChange={(event) => setCerroFiltro(event.target.value)}>
            <option value="todos">Cerro: todos</option>
            {cerros.map((cerro) => (
              <option key={cerro} value={cerro}>
                {cerro}
              </option>
            ))}
          </select>
        </div>

        <p style={{ margin: 0, color: "var(--ink-soft)" }}>
          {loading ? "Cargando..." : `${visibles.length} de ${observations.length} registros`}
        </p>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ minWidth: 920 }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Observador</th>
                <th>Hospedero</th>
                <th>Cerro</th>
                <th>Fenologia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && visibles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "1rem", color: "var(--ink-faint)" }}>
                    No hay observaciones para estos filtros.
                  </td>
                </tr>
              ) : null}
              {visibles.map((observation) => (
                <tr key={observation.id} style={{ opacity: observation.oculta ? 0.58 : 1 }}>
                  <td>{new Date(observation.creadoEn).toLocaleDateString("es-CL")}</td>
                  <td>{observation.nombreObservador}</td>
                  <td>{etiquetaHospedero(observation.hospedero)}</td>
                  <td>{observation.cerro ?? "Sin cerro"}</td>
                  <td>{observation.fenologia}</td>
                  <td>
                    <strong
                      style={{
                        color: observation.verificada
                          ? "var(--forest)"
                          : observation.oculta
                            ? "var(--ink-faint)"
                            : "var(--quintral)",
                      }}
                    >
                      {observation.verificada
                        ? "Verificada"
                        : observation.oculta
                          ? "Oculta"
                          : "Pendiente"}
                    </strong>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={smallButton}
                        onClick={() => {
                          setEditingId(observation.id);
                          setEditForm(toEditForm(observation));
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={smallButton}
                        onClick={() => toggleOculta(observation.id)}
                      >
                        {observation.oculta ? "Mostrar" : "Ocultar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={smallButton}
                        onClick={() => toggleVerificada(observation.id)}
                      >
                        {observation.verificada ? "Quitar verificacion" : "Verificar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ ...smallButton, color: "var(--quintral-deep)" }}
                        onClick={() => setPendingDeleteId(observation.id)}
                      >
                        Borrar
                      </button>
                    </div>

                    {editingId === observation.id && editForm ? (
                      <div
                        style={{
                          marginTop: "0.85rem",
                          padding: "0.9rem",
                          border: "1px solid var(--line-soft)",
                          borderRadius: "var(--r-md)",
                          display: "grid",
                          gap: "0.75rem",
                          background: "var(--bg-alt)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "0.75rem",
                          }}
                        >
                          <label className="field">
                            <span>Hospedero</span>
                            <select
                              value={editForm.hospedero}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current
                                    ? { ...current, hospedero: event.target.value as Host }
                                    : current,
                                )
                              }
                            >
                              {HOSPEDEROS.map((host) => (
                                <option key={host} value={host}>
                                  {etiquetaHospedero(host)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Fenologia</span>
                            <input
                              value={editForm.fenologia}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current ? { ...current, fenologia: event.target.value } : current,
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Cerro</span>
                            <input
                              value={editForm.cerro}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current ? { ...current, cerro: event.target.value } : current,
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Altitud</span>
                            <input
                              value={editForm.altitud}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current ? { ...current, altitud: event.target.value } : current,
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Exposicion</span>
                            <input
                              value={editForm.exposicionSolar}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current
                                    ? { ...current, exposicionSolar: event.target.value }
                                    : current,
                                )
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Notas admin</span>
                            <input
                              value={editForm.notasAdmin}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current ? { ...current, notasAdmin: event.target.value } : current,
                                )
                              }
                            />
                          </label>
                        </div>

                        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn btn--primary"
                            style={smallButton}
                            onClick={() => saveEdit(observation.id)}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={smallButton}
                            onClick={() => {
                              setEditingId(null);
                              setEditForm(null);
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {pendingDeleteId === observation.id ? (
                      <div style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                        <span style={{ marginRight: "0.6rem" }}>Eliminar esta observacion?</span>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          style={{ ...smallButton, color: "var(--quintral-deep)" }}
                          onClick={() => deleteObservation(observation.id)}
                        >
                          Si, borrar
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          style={smallButton}
                          onClick={() => setPendingDeleteId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card card-pad rise" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Historial de acciones</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.7rem" }}>
          {logEntries.length === 0 ? (
            <li style={{ color: "var(--ink-faint)" }}>Sin acciones registradas.</li>
          ) : (
            logEntries.map((entry) => (
              <li
                key={entry.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                  paddingBottom: "0.7rem",
                  borderBottom: "1px solid var(--line-soft)",
                }}
              >
                <span>
                  <strong>{entry.accion}</strong>{" "}
                  {entry.observacion_id
                    ? `en ${entry.observacion_id.slice(0, 8)}...`
                    : "sin observacion"}
                </span>
                <span style={{ color: "var(--ink-faint)" }}>
                  {new Date(entry.fecha).toLocaleString("es-CL")}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}

const smallButton: React.CSSProperties = {
  padding: "0.45rem 0.85rem",
  fontSize: "0.85rem",
};
