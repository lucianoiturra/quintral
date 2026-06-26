import { describe, it, expect } from "vitest";
import {
  MUESTRAS,
  COMPUESTOS,
  promedioCompuesto,
  maxCompuesto,
  PERFIL_REFERENCIA,
} from "@/lib/fitoquimica";

describe("fitoquimica", () => {
  it("carga las dos muestras reales con sus códigos", () => {
    expect(MUESTRAS.map((m) => m.codigo)).toEqual(["S-218-25", "S-219-25"]);
    expect(MUESTRAS[0].valores.polifenoles).toBe(52.8);
    expect(MUESTRAS[1].valores.flavonoides).toBe(49.5);
    expect(MUESTRAS[0].valores.antocianinas).toBeNull();
  });

  it("define los tres compuestos con unidad", () => {
    expect(COMPUESTOS.map((c) => c.id)).toEqual([
      "polifenoles",
      "flavonoides",
      "antocianinas",
    ]);
    expect(COMPUESTOS[2].unidad).toBe("mg Cy3Glu/g");
  });

  it("promedia compuestos medidos e ignora n/d", () => {
    expect(promedioCompuesto("polifenoles")).toBe(52.8);
    expect(promedioCompuesto("flavonoides")).toBeCloseTo(49.75, 2);
    expect(promedioCompuesto("antocianinas")).toBeNull();
  });

  it("maxCompuesto devuelve 0 cuando todo es n/d", () => {
    expect(maxCompuesto("polifenoles")).toBe(52.8);
    expect(maxCompuesto("antocianinas")).toBe(0);
  });

  it("PERFIL_REFERENCIA usa promedios y deja antocianinas en null", () => {
    expect(PERFIL_REFERENCIA.flavonoides).toBeCloseTo(49.75, 2);
    expect(PERFIL_REFERENCIA.antocianinas).toBeNull();
  });
});
