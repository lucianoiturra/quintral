import { describe, it, expect } from "vitest";
import {
  BACTERIAS,
  CONCENTRACIONES,
  CURVAS,
  ANTIBIOGRAMAS,
  bacteria,
  curvasDeBacteria,
  antibiogramasDeBacteria,
} from "@/lib/antibacteriano";

describe("antibacteriano", () => {
  it("define las tres bacterias con cepa y gram", () => {
    expect(BACTERIAS.map((b) => b.id)).toEqual([
      "e-coli",
      "s-aureus",
      "e-faecalis",
    ]);
    expect(bacteria("e-coli").cepa).toBe("ATCC 25922");
    expect(bacteria("s-aureus").gram).toBe("positiva");
  });

  it("bacteria() lanza ante un id desconocido", () => {
    // @ts-expect-error id inválido a propósito
    expect(() => bacteria("marina")).toThrow();
  });

  it("tiene 6 curvas (3 bacterias x 2 hospederos) con 5 concentraciones", () => {
    expect(CURVAS).toHaveLength(6);
    expect(CONCENTRACIONES).toEqual([0, 128, 256, 512, 1024]);
    for (const c of CURVAS) {
      expect(c.puntos.map((p) => p.concentracion)).toEqual(CONCENTRACIONES);
      expect(typeof c.controlPos).toBe("number");
      expect(typeof c.controlNeg).toBe("number");
    }
  });

  it("curvasDeBacteria devuelve litre y quillay", () => {
    const cs = curvasDeBacteria("e-coli");
    expect(cs.map((c) => c.hospedero).sort()).toEqual(["litre", "quillay"]);
    const litre = cs.find((c) => c.hospedero === "litre")!;
    expect(litre.puntos[4].od).toBe(0.69); // E. coli litre @1024
  });

  it("incluye las fotos de antibiograma confirmadas", () => {
    const archivos = ANTIBIOGRAMAS.map((a) => a.archivo);
    expect(archivos).toContain(
      "/figuras/antibacteriano/antibiograma-e-coli-ampicilina.jpg",
    );
    expect(antibiogramasDeBacteria("s-aureus").length).toBeGreaterThan(0);
  });
});
