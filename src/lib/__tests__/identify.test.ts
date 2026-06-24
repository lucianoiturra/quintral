import { describe, it, expect } from "vitest";
import { parseIdentifyResult } from "@/lib/identify";

describe("parseIdentifyResult", () => {
  it("acepta una respuesta válida", () => {
    const r = parseIdentifyResult({
      esQuintral: true,
      hospederoProbable: "quillay",
      confianza: 0.82,
      fenologia: "en flor",
      notas: "hojas verdes",
    });
    expect(r).toEqual({
      esQuintral: true,
      hospederoProbable: "quillay",
      confianza: 0.82,
      fenologia: "en flor",
      notas: "hojas verdes",
    });
  });

  it("mapea hospedero desconocido a 'otro'", () => {
    const r = parseIdentifyResult({ hospederoProbable: "boldo" });
    expect(r.hospederoProbable).toBe("otro");
  });

  it("recorta la confianza al rango 0..1", () => {
    expect(parseIdentifyResult({ confianza: 5 }).confianza).toBe(1);
    expect(parseIdentifyResult({ confianza: -2 }).confianza).toBe(0);
  });

  it("usa valores por defecto seguros ante campos faltantes", () => {
    const r = parseIdentifyResult({});
    expect(r.esQuintral).toBe(false);
    expect(r.hospederoProbable).toBe("otro");
    expect(r.confianza).toBe(0);
    expect(r.fenologia).toBe("");
    expect(r.notas).toBe("");
  });

  it("no explota con entrada no-objeto", () => {
    expect(parseIdentifyResult(null).hospederoProbable).toBe("otro");
    expect(parseIdentifyResult("texto").esQuintral).toBe(false);
  });
});
