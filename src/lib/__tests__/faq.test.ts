import { describe, it, expect } from "vitest";
import { FAQ } from "@/lib/faq";

describe("FAQ", () => {
  it("tiene 15 preguntas con texto no vacío", () => {
    expect(FAQ).toHaveLength(15);
    for (const item of FAQ) {
      expect(item.pregunta.trim().length).toBeGreaterThan(0);
      expect(item.respuesta.trim().length).toBeGreaterThan(0);
    }
  });

  it("empieza por la definición del quintral", () => {
    expect(FAQ[0].pregunta).toBe("¿Qué es el quintral?");
    expect(FAQ[0].respuesta).toContain("Tristerix corymbosus");
  });

  it("no tiene preguntas duplicadas", () => {
    const set = new Set(FAQ.map((f) => f.pregunta));
    expect(set.size).toBe(FAQ.length);
  });
});
