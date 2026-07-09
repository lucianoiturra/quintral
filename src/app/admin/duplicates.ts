import type { Observation } from "@/lib/types";

export interface DuplicateGroup {
  key: string;
  /** El registro más antiguo del grupo: es el que se conserva. */
  mantiene: Observation;
  /** Copias posteriores idénticas: se borrarían. */
  duplicados: Observation[];
}

/**
 * Dos observaciones se consideran duplicadas cuando comparten observador,
 * coordenadas, hospedero y fenología. Es la huella que deja el bug de
 * sincronización, que reinsertaba el mismo aporte muchas veces.
 */
function claveDuplicado(o: Observation): string {
  return [
    o.nombreObservador.trim().toLowerCase(),
    o.lat,
    o.lng,
    o.hospedero,
    (o.hospederoOtro ?? "").trim().toLowerCase(),
    (o.fenologia ?? "").trim().toLowerCase(),
  ].join("|");
}

export function findDuplicateGroups(observations: Observation[]): DuplicateGroup[] {
  const mapa = new Map<string, Observation[]>();
  for (const o of observations) {
    const k = claveDuplicado(o);
    const arr = mapa.get(k);
    if (arr) arr.push(o);
    else mapa.set(k, [o]);
  }

  const grupos: DuplicateGroup[] = [];
  for (const [key, items] of mapa) {
    if (items.length < 2) continue;
    const ordenados = [...items].sort(
      (a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime(),
    );
    grupos.push({
      key,
      mantiene: ordenados[0],
      duplicados: ordenados.slice(1),
    });
  }
  return grupos;
}

export function idsDeDuplicados(groups: DuplicateGroup[]): string[] {
  return groups.flatMap((g) => g.duplicados.map((o) => o.id));
}

export function contarDuplicados(groups: DuplicateGroup[]): number {
  return groups.reduce((n, g) => n + g.duplicados.length, 0);
}
