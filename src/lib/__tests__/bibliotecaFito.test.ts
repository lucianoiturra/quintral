import { describe, it, expect } from "vitest";
import { BIBLIOTECA, PROPIEDADES_CANONICAS } from "@/lib/bibliotecaFito";

describe("BIBLIOTECA fitoquímica", () => {
  it("tiene las 6 fichas esperadas", () => {
    expect(BIBLIOTECA.map((c) => c.id)).toEqual([
      "polifenoles",
      "flavonoides",
      "terpenoides",
      "quinonas",
      "esteroles",
      "glicosidos",
    ]);
  });

  it("cada ficha está completa y marcada como presente en el quintral", () => {
    for (const ficha of BIBLIOTECA) {
      expect(ficha.nombre.trim().length).toBeGreaterThan(0);
      expect(ficha.queEs.trim().length).toBeGreaterThan(0);
      expect(ficha.funcionEnPlanta.length).toBeGreaterThan(0);
      expect(ficha.aplicacionesBiomedicas.length).toBeGreaterThan(0);
      expect(ficha.presenteEnQuintral).toBe(true);
      expect(ficha.estudios.length).toBeGreaterThan(0);
      for (const e of ficha.estudios) {
        expect(e.url).toMatch(/^https:\/\//);
        expect(e.url).not.toContain("utm_source");
      }
    }
  });

  it("polifenoles y flavonoides citan a Torres y Simirgiotis", () => {
    const poli = BIBLIOTECA.find((c) => c.id === "polifenoles")!;
    const citas = poli.estudios.map((e) => e.cita);
    expect(citas.some((c) => c.includes("Torres"))).toBe(true);
    expect(citas.some((c) => c.includes("Simirgiotis"))).toBe(true);
  });
});

describe("modelo canónico de la Biblioteca", () => {
  it("cada ficha tiene familia, resumen y propiedades canónicas válidas", () => {
    for (const f of BIBLIOTECA) {
      expect(f.familia.length).toBeGreaterThan(0);
      expect(f.resumen.length).toBeGreaterThan(0);
      expect(f.propiedades.length).toBeGreaterThan(0);
      for (const p of f.propiedades) {
        expect(PROPIEDADES_CANONICAS).toContain(p);
      }
    }
  });

  it("expone 7 propiedades canónicas en orden de columnas", () => {
    expect(PROPIEDADES_CANONICAS).toEqual([
      "Antioxidante",
      "Antiinflamatoria",
      "Antimicrobiana",
      "Antifúngica",
      "Antivírica",
      "Anticancerígena",
      "Cardio",
    ]);
  });

  it("los polifenoles marcan antioxidante y antimicrobiana", () => {
    const poli = BIBLIOTECA.find((f) => f.id === "polifenoles")!;
    expect(poli.propiedades).toContain("Antioxidante");
    expect(poli.propiedades).toContain("Antimicrobiana");
  });
});
