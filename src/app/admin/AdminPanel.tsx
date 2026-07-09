"use client";

import { useEffect, useMemo, useState } from "react";
import { etiquetaHospedero, HOSPEDEROS } from "@/lib/hosts";
import type { Host, Observation } from "@/lib/types";
import {
  buildAdminDashboardSummary,
  type AdminStatusFilter,
} from "@/app/admin/dashboard";
import {
  findDuplicateGroups,
  idsDeDuplicados,
  contarDuplicados,
} from "@/app/admin/duplicates";

type AdminLogEntry = {
  id: string;
  observacion_id: string | null;
  accion: string;
  detalle: unknown;
  fecha: string;
};

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
  const [filter, setFilter] = useState<AdminStatusFilter>("todas");
  const [hospederoFiltro, setHospederoFiltro] = useState<Host | "todos">("todos");
  const [cerroFiltro, setCerroFiltro] = useState<string>("todos");
  const [monthFiltro, setMonthFiltro] = useState<string>("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [dedupConfirm, setDedupConfirm] = useState(false);
  const [dedupBorrando, setDedupBorrando] = useState(false);
  const [dedupResultado, setDedupResultado] = useState<string | null>(null);
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
        const [obsError, logError] = await Promise.all([
          readErrorMessage(obsResponse, "No se pudo cargar observaciones."),
          readErrorMessage(logResponse, "No se pudo cargar el historial admin."),
        ]);
        setError([obsError, logError].filter(Boolean).join(" | "));
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
      setError(await readErrorMessage(response, "No se pudo actualizar la observacion."));
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
      setError(await readErrorMessage(response, "No se pudo borrar la observacion."));
      return;
    }

    setObservations((current) => current.filter((item) => item.id !== id));
    setPendingDeleteId(null);
    prependLog(id, "borrada");
  }

  async function borrarDuplicados(ids: string[]) {
    if (ids.length === 0) return;
    setDedupBorrando(true);
    setError(null);
    setDedupResultado(null);

    const response = await fetch("/api/admin/observaciones/bulk-delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      setError(await readErrorMessage(response, "No se pudieron borrar los duplicados."));
      setDedupBorrando(false);
      return;
    }

    const idSet = new Set(ids);
    setObservations((current) => current.filter((item) => !idSet.has(item.id)));
    setDedupConfirm(false);
    setDedupBorrando(false);
    setDedupResultado(`Se borraron ${ids.length} registro(s) duplicado(s).`);
    prependLog(null, `borrado_masivo (${ids.length})`);
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

  const duplicateGroups = useMemo(() => findDuplicateGroups(observations), [observations]);
  const duplicadosIds = useMemo(() => idsDeDuplicados(duplicateGroups), [duplicateGroups]);
  const totalDuplicados = useMemo(() => contarDuplicados(duplicateGroups), [duplicateGroups]);

  const summary = useMemo(
    () =>
      buildAdminDashboardSummary(observations, {
        status: filter,
        hospedero: hospederoFiltro,
        cerro: cerroFiltro,
        month: monthFiltro,
      }),
    [cerroFiltro, filter, hospederoFiltro, monthFiltro, observations],
  );

  const visibles = summary.filtered;

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

      <section
        className="rise"
        style={{
          padding: "1.5rem",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r-lg)",
          background:
            "linear-gradient(135deg, oklch(0.995 0.004 95) 0%, oklch(0.975 0.012 110) 100%)",
          boxShadow: "var(--shadow-sm)",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "end",
            marginBottom: "1rem",
          }}
        >
          <div style={{ maxWidth: "60ch" }}>
            <h2 style={{ fontSize: "1.45rem", marginBottom: "0.35rem" }}>Resumen del monitoreo</h2>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              Vista rápida del estado del banco de observaciones, con foco en temporada,
              hospederos dominantes y ubicaciones con más actividad.
            </p>
          </div>
          <label className="field" style={{ minWidth: 220 }}>
            <span>Mes</span>
            <select value={monthFiltro} onChange={(event) => setMonthFiltro(event.target.value)}>
              <option value="todos">Todos los meses</option>
              {summary.months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.9rem",
            marginBottom: "1.25rem",
          }}
        >
          {summary.metrics.map((metric) => (
            <div
              key={metric.label}
              style={{
                padding: "1rem 1.05rem",
                borderRadius: "var(--r-md)",
                background: "oklch(1 0 0 / 0.72)",
                border: "1px solid var(--line-soft)",
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-faint)" }}>
                {metric.label}
              </div>
              <div style={{ fontSize: "2rem", lineHeight: 1.05, margin: "0.35rem 0 0.25rem" }}>
                {metric.value}
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>{metric.hint}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          <RankingPanel
            title="Ranking de hospederos"
            subtitle="Top segun la vista filtrada"
            emptyLabel="No hay hospederos para este filtro."
            bars={summary.hostRanking}
          />
          <RankingPanel
            title="Ranking de ubicaciones"
            subtitle="Usa el campo cerro como proxy de ciudad o zona"
            emptyLabel="No hay ubicaciones para este filtro."
            bars={summary.locationRanking}
          />
        </div>
      </section>

      <section
        className="card card-pad rise"
        style={{
          marginBottom: "1.5rem",
          borderColor: totalDuplicados > 0 ? "var(--quintral)" : "var(--line-soft)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ maxWidth: "60ch" }}>
            <h2 style={{ fontSize: "1.45rem", marginBottom: "0.35rem" }}>Duplicados</h2>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              {loading
                ? "Analizando registros…"
                : totalDuplicados > 0
                  ? `Se detectaron ${totalDuplicados} registro(s) duplicado(s) en ${duplicateGroups.length} grupo(s). Se conserva el más antiguo de cada grupo y se borran las copias.`
                  : "No se detectaron duplicados. Cada registro es único por observador, coordenadas, hospedero y fenología."}
            </p>
            {dedupResultado ? (
              <p className="alert alert--ok" style={{ marginTop: "0.75rem" }}>
                {dedupResultado}
              </p>
            ) : null}
          </div>

          {totalDuplicados > 0 && !dedupConfirm ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setDedupConfirm(true)}
              disabled={dedupBorrando}
            >
              Borrar {totalDuplicados} duplicado(s)
            </button>
          ) : null}
        </div>

        {dedupConfirm ? (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.9rem 1rem",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-alt)",
            }}
          >
            <p style={{ margin: "0 0 0.75rem" }}>
              ¿Borrar {totalDuplicados} registro(s) duplicado(s)? Se conservará el más
              antiguo de cada grupo. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn--primary"
                style={{ ...smallButton, color: "var(--quintral-deep)" }}
                onClick={() => borrarDuplicados(duplicadosIds)}
                disabled={dedupBorrando}
              >
                {dedupBorrando ? "Borrando…" : "Sí, borrar duplicados"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                style={smallButton}
                onClick={() => setDedupConfirm(false)}
                disabled={dedupBorrando}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card card-pad rise" style={{ display: "grid", gap: "1rem" }}>
        <div className="pill-row">
          {(["todas", "ocultas", "verificadas"] as AdminStatusFilter[]).map((item) => (
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
          <select
            value={hospederoFiltro}
            onChange={(event) => setHospederoFiltro(event.target.value as Host | "todos")}
          >
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
          {loading ? "Cargando..." : `${visibles.length} de ${observations.length} registros en la vista actual`}
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

function RankingPanel({
  title,
  subtitle,
  emptyLabel,
  bars,
}: {
  title: string;
  subtitle: string;
  emptyLabel: string;
  bars: Array<{ etiqueta: string; valor: number; color: string }>;
}) {
  const max = Math.max(...bars.map((bar) => bar.valor), 1);

  return (
    <div
      style={{
        padding: "1rem 1.05rem",
        borderRadius: "var(--r-md)",
        background: "oklch(1 0 0 / 0.62)",
        border: "1px solid var(--line-soft)",
      }}
    >
      <div style={{ marginBottom: "0.8rem" }}>
        <h3 style={{ fontSize: "1.05rem", marginBottom: "0.2rem", fontFamily: "var(--font-sans)" }}>
          {title}
        </h3>
        <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: "0.9rem" }}>{subtitle}</p>
      </div>

      {bars.length === 0 ? (
        <p style={{ margin: 0, color: "var(--ink-faint)" }}>{emptyLabel}</p>
      ) : (
        <div style={{ display: "grid", gap: "0.8rem" }}>
          {bars.map((bar) => (
            <div key={bar.etiqueta} style={{ display: "grid", gap: "0.25rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.8rem",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 600 }}>{bar.etiqueta}</span>
                <span style={{ color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums" }}>
                  {bar.valor}
                </span>
              </div>
              <div
                aria-hidden="true"
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "var(--line-soft)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(bar.valor / max) * 100}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: bar.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

const smallButton: React.CSSProperties = {
  padding: "0.45rem 0.85rem",
  fontSize: "0.85rem",
};
