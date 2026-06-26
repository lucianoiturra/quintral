import { describe, it, expect } from "vitest";
import { filterObservations } from "@/lib/filterObservations";
import type { Observation } from "@/lib/types";

function obs(p: Partial<Observation>): Observation {
  return {
    id: "x", nombreObservador: "a", lat: 0, lng: 0, hospedero: "quillay",
    hospederoOtro: null, fenologia: "", altitud: null, exposicionSolar: null,
    fotoUrl: null, cerro: "Manquehue", creadoEn: "",
    oculta: false, verificada: false, notasAdmin: null, editadoEn: null,
    ...p,
  };
}

describe("filterObservations", () => {
  const data = [
    obs({ id: "1", cerro: "Manquehue", hospedero: "quillay" }),
    obs({ id: "2", cerro: "El Carbón", hospedero: "litre" }),
    obs({ id: "3", cerro: "Manquehue", hospedero: "litre" }),
  ];

  it("'todos' y 'todos' devuelve todo", () => {
    expect(filterObservations(data, "todos", "todos")).toHaveLength(3);
  });

  it("filtra por cerro", () => {
    expect(filterObservations(data, "Manquehue", "todos").map((o) => o.id)).toEqual(["1", "3"]);
  });

  it("filtra por hospedero", () => {
    expect(filterObservations(data, "todos", "litre").map((o) => o.id)).toEqual(["2", "3"]);
  });

  it("combina ambos filtros", () => {
    expect(filterObservations(data, "Manquehue", "litre").map((o) => o.id)).toEqual(["3"]);
  });
});
