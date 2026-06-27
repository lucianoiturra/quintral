import { describe, it, expect } from "vitest";
import { extractJson, parseIdentifyResult, notaMultiFoto } from "@/lib/identify";

describe("extractJson", () => {
  it("parsea JSON puro directamente", () => {
    expect(
      extractJson('{"esQuintral":true,"opciones":[],"fenologia":"en flor","notas":"ok"}'),
    ).toEqual({
      esQuintral: true,
      opciones: [],
      fenologia: "en flor",
      notas: "ok",
    });
  });

  it("encuentra el JSON correcto aunque haya llaves en texto libre", () => {
    expect(
      extractJson(
        'Observacion preliminar: corteza con grietas {finas}. Resultado: {"esQuintral":true,"opciones":[],"fenologia":"en flor","notas":"ok"}',
      ),
    ).toEqual({
      esQuintral: true,
      opciones: [],
      fenologia: "en flor",
      notas: "ok",
    });
  });
});

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

import { construirPrompt, PROMPT_IDENTIFY } from "@/lib/identify";
import { ZONAS } from "@/lib/zonas";

describe("construirPrompt", () => {
  it("sin zona devuelve el prompt base sin cambios", () => {
    expect(construirPrompt()).toBe(PROMPT_IDENTIFY);
  });

  it("con zona antepone un bloque con la etiqueta y la pista", () => {
    const centro = ZONAS.find((z) => z.id === "centro")!;
    const prompt = construirPrompt(centro);
    expect(prompt).toContain(centro.etiqueta);
    expect(prompt).toContain(centro.pista);
    expect(prompt).toContain(PROMPT_IDENTIFY);
    // el bloque geográfico va antes del prompt base
    expect(prompt.indexOf(centro.etiqueta)).toBeLessThan(prompt.indexOf(PROMPT_IDENTIFY));
  });
});

describe("notaMultiFoto", () => {
  it("vacío con 0 o 1 imagen", () => {
    expect(notaMultiFoto([])).toBe("");
    expect(notaMultiFoto([{}])).toBe("");
  });
  it("con 2+ imágenes menciona el mismo árbol y el número", () => {
    const nota = notaMultiFoto([{ etiqueta: "corteza" }, { etiqueta: "hoja" }]);
    expect(nota).toContain("MISMO árbol");
    expect(nota).toContain("2");
  });
});
