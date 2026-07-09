import { describe, expect, it } from "vitest";
import {
  findDuplicateGroups,
  idsDeDuplicados,
  contarDuplicados,
} from "@/app/admin/duplicates";
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

describe("findDuplicateGroups", () => {
  it("agrupa registros idénticos y conserva el más antiguo", () => {
    const grupos = findDuplicateGroups([
      observation({ id: "a", creadoEn: "2026-06-20T10:00:00Z" }),
      observation({ id: "b", creadoEn: "2026-06-20T09:00:00Z" }),
      observation({ id: "c", creadoEn: "2026-06-20T11:00:00Z" }),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].mantiene.id).toBe("b");
    expect(grupos[0].duplicados.map((o) => o.id).sort()).toEqual(["a", "c"]);
  });

  it("no marca como duplicados registros con distinta coordenada u hospedero", () => {
    const grupos = findDuplicateGroups([
      observation({ id: "a" }),
      observation({ id: "b", lat: -33.9 }),
      observation({ id: "c", hospedero: "litre" }),
    ]);

    expect(grupos).toHaveLength(0);
  });

  it("idsDeDuplicados y contarDuplicados excluyen el registro conservado", () => {
    const grupos = findDuplicateGroups([
      observation({ id: "a", creadoEn: "2026-06-20T10:00:00Z" }),
      observation({ id: "b", creadoEn: "2026-06-20T09:00:00Z" }),
      observation({ id: "c", creadoEn: "2026-06-20T11:00:00Z" }),
    ]);

    expect(contarDuplicados(grupos)).toBe(2);
    expect(idsDeDuplicados(grupos).sort()).toEqual(["a", "c"]);
  });
});
