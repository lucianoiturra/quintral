import { colorHospedero, etiquetaHospedero } from "@/lib/hosts";
import type { Host, Observation } from "@/lib/types";

export type AdminStatusFilter = "todas" | "ocultas" | "verificadas";

export type AdminDashboardFilters = {
  status: AdminStatusFilter;
  hospedero: Host | "todos";
  cerro: string | "todos";
  month: string | "todos";
};

export type SummaryMetric = {
  label: string;
  value: number;
  hint: string;
};

export type RankingBar = {
  etiqueta: string;
  valor: number;
  color: string;
};

export type MonthOption = {
  value: string;
  label: string;
  count: number;
};

export type AdminDashboardSummary = {
  filtered: Observation[];
  months: MonthOption[];
  metrics: SummaryMetric[];
  hostRanking: RankingBar[];
  locationRanking: RankingBar[];
};

export function buildAdminDashboardSummary(
  observations: Observation[],
  filters: AdminDashboardFilters,
): AdminDashboardSummary {
  const months = buildMonthOptions(observations);
  const filtered = observations.filter((observation) => matchesFilters(observation, filters));
  const verified = filtered.filter((observation) => observation.verificada).length;
  const hidden = filtered.filter((observation) => observation.oculta).length;
  const visible = filtered.length - hidden;
  const activeLocations = new Set(
    filtered.map((observation) => normalizeLocation(observation)).filter(Boolean),
  ).size;

  return {
    filtered,
    months,
    metrics: [
      {
        label: "Registros filtrados",
        value: filtered.length,
        hint: filters.month === "todos" ? "total en la vista actual" : "para el mes seleccionado",
      },
      {
        label: "Verificadas",
        value: verified,
        hint: filtered.length > 0 ? `${Math.round((verified / filtered.length) * 100)}% del filtro` : "sin datos",
      },
      {
        label: "Ocultas",
        value: hidden,
        hint: `${visible} visibles en el mapa publico`,
      },
      {
        label: "Ubicaciones activas",
        value: activeLocations,
        hint: "segun cerro o zona ingresada",
      },
    ],
    hostRanking: rankBy(filtered, (observation) => observation.hospedero).map(({ key, count }) => ({
      etiqueta: etiquetaHospedero(key as Host),
      valor: count,
      color: colorHospedero(key as Host),
    })),
    locationRanking: rankBy(filtered, normalizeLocation).map(({ key, count }, index) => ({
      etiqueta: key,
      valor: count,
      color: index % 2 === 0 ? "var(--forest)" : "var(--forest-bright)",
    })),
  };
}

export function buildMonthOptions(observations: Observation[]): MonthOption[] {
  const counts = new Map<string, number>();

  for (const observation of observations) {
    const key = toMonthKey(observation.creadoEn);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([value, count]) => ({
      value,
      count,
      label: `${formatMonthLabel(value)} (${count})`,
    }));
}

function matchesFilters(observation: Observation, filters: AdminDashboardFilters): boolean {
  if (filters.status === "ocultas" && !observation.oculta) return false;
  if (filters.status === "verificadas" && !observation.verificada) return false;
  if (filters.hospedero !== "todos" && observation.hospedero !== filters.hospedero) return false;
  if (filters.cerro !== "todos" && observation.cerro !== filters.cerro) return false;

  const monthKey = toMonthKey(observation.creadoEn);
  if (filters.month !== "todos" && monthKey !== filters.month) return false;

  return true;
}

function normalizeLocation(observation: Observation): string {
  return observation.cerro?.trim() || "Sin cerro";
}

function rankBy(
  observations: Observation[],
  getKey: (observation: Observation) => string,
): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();

  for (const observation of observations) {
    const key = getKey(observation);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([key, count]) => ({ key, count }));
}

function toMonthKey(isoDate: string): string | null {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(`${year}-${month}-01T00:00:00Z`);
  const label = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return label.slice(0, 1).toUpperCase() + label.slice(1);
}
