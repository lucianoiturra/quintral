import { describe, it, expect } from "vitest";
import { parseIdentifyResult } from "@/lib/identify";

describe("parseIdentifyResult", () => {
  it("acepta una respuesta válida con 2 opciones", () => {
    const r = parseIdentifyResult({
      esQuintral: true,
      opciones: [
        { hospedero: "quillay", confianza: 0.82 },
        { hospedero: "litre", confianza: 0.45 },
      ],
      fenologia: "en flor",
      notas: "hojas verdes",
    });
    expect(r).toEqual({
      esQuintral: true,
      opciones: [
        { hospedero: "quillay", confianza: 0.82 },
        { hospedero: "litre", confianza: 0.45 },
      ],
      fenologia: "en flor",
      notas: "hojas verdes",
    });
  });

  it("mapea hospedero desconocido a 'otro'", () => {
    const r = parseIdentifyResult({
      opciones: [
        { hospedero: "desconocido", confianza: 0.5 },
        { hospedero: "peumo", confianza: 0.3 },
      ],
    });
    expect(r.opciones[0].hospedero).toBe("otro");
    expect(r.opciones[1].hospedero).toBe("peumo");
  });

  it("recorta la confianza al rango 0..1 en cada opción", () => {
    const r = parseIdentifyResult({
      opciones: [
        { hospedero: "quillay", confianza: 5 },
        { hospedero: "litre", confianza: -2 },
      ],
    });
    expect(r.opciones[0].confianza).toBe(1);
    expect(r.opciones[1].confianza).toBe(0);
  });

  it("usa fallback seguro cuando faltan opciones", () => {
    const r = parseIdentifyResult({});
    expect(r.esQuintral).toBe(false);
    expect(r.opciones[0]).toEqual({ hospedero: "otro", confianza: 0 });
    expect(r.opciones[1]).toEqual({ hospedero: "otro", confianza: 0 });
    expect(r.fenologia).toBe("");
    expect(r.notas).toBe("");
  });

  it("no explota con entrada no-objeto", () => {
    expect(parseIdentifyResult(null).opciones[0].hospedero).toBe("otro");
    expect(parseIdentifyResult("texto").esQuintral).toBe(false);
  });
});
