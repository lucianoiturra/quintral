import { describe, it, expect } from "vitest";
import { HOSPEDEROS, colorHospedero, etiquetaHospedero } from "@/lib/hosts";

describe("hosts", () => {
  it("incluye los 31 hospederos", () => {
    expect(HOSPEDEROS).toHaveLength(31);
    expect(HOSPEDEROS).toContain("peumo");
    expect(HOSPEDEROS).toContain("boldo");
    expect(HOSPEDEROS).toContain("quillay");
    expect(HOSPEDEROS).toContain("eulychnia-breviflora");
    expect(HOSPEDEROS).toContain("otro");
  });

  it("da un color hexadecimal distinto por cada hospedero", () => {
    const colores = HOSPEDEROS.map(colorHospedero);
    expect(new Set(colores).size).toBe(colores.length);
    colores.forEach((c) => expect(c).toMatch(/^#[0-9a-fA-F]{6}$/));
  });

  it("etiquetaHospedero devuelve nombre legible", () => {
    expect(etiquetaHospedero("quillay")).toBe("Quillay");
    expect(etiquetaHospedero("platano-oriental")).toBe("Plátano oriental");
    expect(etiquetaHospedero("pingo-pingo")).toBe("Pingo-pingo");
    expect(etiquetaHospedero("eulychnia-breviflora")).toBe("Eulychnia breviflora");
    expect(etiquetaHospedero("nothofagus-nitida")).toBe("Nothofagus nitida");
    expect(etiquetaHospedero("otro")).toBe("Otro");
  });
});
