import { describe, expect, it } from "vitest";
import { buildAdminDashboardSummary, type AdminDashboardFilters } from "@/app/admin/dashboard";
import type { Observation } from "@/lib/types";

function observation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "1",
    nombreObservador: "Ana",
    lat: -33.2,
    lng: -70.3,
    hospedero: "quillay",
    hospederoOtro: null,
    fenologia: "en flor",
    altitud: null,
    exposicionSolar: null,
    fotoUrl: null,
    cerro: "Manquehue",
    creadoEn: "2026-06-20T00:00:00Z",
    oculta: false,
    verificada: false,
    notasAdmin: null,
    editadoEn: null,
    ...overrides,
  };
}

const defaultFilters: AdminDashboardFilters = {
  status: "todas",
  hospedero: "todos",
  cerro: "todos",
  month: "todos",
};

describe("buildAdminDashboardSummary", () => {
  it("construye opciones de mes en orden descendente", () => {
    const summary = buildAdminDashboardSummary(
      [
        observation({ creadoEn: "2026-05-03T00:00:00Z" }),
        observation({ id: "2", creadoEn: "2026-06-03T00:00:00Z" }),
        observation({ id: "3", creadoEn: "2026-06-07T00:00:00Z" }),
      ],
      defaultFilters,
    );

    expect(summary.months.map((month) => month.value)).toEqual(["2026-06", "2026-05"]);
    expect(summary.months[0]?.count).toBe(2);
  });

  it("filtra por mes y calcula metricas", () => {
    const summary = buildAdminDashboardSummary(
      [
        observation({ verificada: true, creadoEn: "2026-06-01T00:00:00Z" }),
        observation({ id: "2", oculta: true, creadoEn: "2026-06-12T00:00:00Z" }),
        observation({ id: "3", creadoEn: "2026-05-12T00:00:00Z" }),
      ],
      { ...defaultFilters, month: "2026-06" },
    );

    expect(summary.filtered).toHaveLength(2);
    expect(summary.metrics[0]?.value).toBe(2);
    expect(summary.metrics[1]?.value).toBe(1);
    expect(summary.metrics[2]?.value).toBe(1);
  });

  it("arma rankings de hospedero y ubicacion", () => {
    const summary = buildAdminDashboardSummary(
      [
        observation({ hospedero: "quillay", cerro: "Manquehue" }),
        observation({ id: "2", hospedero: "quillay", cerro: "Manquehue" }),
        observation({ id: "3", hospedero: "litre", cerro: "Cordillera" }),
      ],
      defaultFilters,
    );

    expect(summary.hostRanking[0]).toMatchObject({ etiqueta: "Quillay", valor: 2 });
    expect(summary.locationRanking[0]).toMatchObject({ etiqueta: "Manquehue", valor: 2 });
  });
});
