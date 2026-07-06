import { describe, it, expect } from "vitest";
import {
  RESULTADOS,
  CONCENTRACIONES,
  CONTROL_POSITIVO,
  FACTORES,
  LINEAS_FUTURAS,
  APRENDIZAJE,
} from "@/lib/antimicrobiano";

describe("evidencia antimicrobiana", () => {
  it("registra las 3 bacterias, todas sin inhibición", () => {
    expect(RESULTADOS.map((r) => r.bacteria)).toEqual([
      "Escherichia coli ATCC 25922",
      "Staphylococcus aureus ATCC 25923",
      "Enterococcus faecalis ATCC 29212",
    ]);
    expect(RESULTADOS.every((r) => r.inhibicion === false)).toBe(true);
  });

  it("documenta las concentraciones ensayadas y el control", () => {
    expect(CONCENTRACIONES).toEqual([128, 256, 512, 1024]);
    expect(CONTROL_POSITIVO).toMatch(/ampicilina/i);
  });

  it("aporta factores, líneas futuras y aprendizaje", () => {
    expect(FACTORES.length).toBeGreaterThan(0);
    expect(LINEAS_FUTURAS.length).toBeGreaterThan(0);
    expect(APRENDIZAJE.trim().length).toBeGreaterThan(0);
  });
});
