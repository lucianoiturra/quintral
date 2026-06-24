import type { Host, Observation } from "@/lib/types";

export function filterObservations(
  obs: Observation[],
  cerro: string | "todos",
  hospedero: Host | "todos",
): Observation[] {
  return obs.filter(
    (o) =>
      (cerro === "todos" || o.cerro === cerro) &&
      (hospedero === "todos" || o.hospedero === hospedero),
  );
}
