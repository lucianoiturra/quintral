import { describe, it, expect } from "vitest";
import { HOSPEDEROS, colorHospedero, etiquetaHospedero } from "@/lib/hosts";

describe("hosts", () => {
  it("incluye los cinco hospederos en orden", () => {
    expect(HOSPEDEROS).toEqual(["aromo", "colliguay", "litre", "quillay", "otro"]);
  });

  it("da un color distinto por hospedero conocido", () => {
    const colores = HOSPEDEROS.map(colorHospedero);
    expect(new Set(colores).size).toBe(colores.length);
    expect(colorHospedero("aromo")).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("etiqueta con mayúscula inicial", () => {
    expect(etiquetaHospedero("quillay")).toBe("Quillay");
    expect(etiquetaHospedero("otro")).toBe("Otro");
  });
});
