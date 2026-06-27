import { describe, it, expect } from "vitest";
import { ETIQUETAS_FOTO, ETIQUETAS_FOTO_TEXTO } from "@/lib/imagenes";

describe("ETIQUETAS_FOTO", () => {
  it("define las 4 vistas guiadas en orden", () => {
    expect(ETIQUETAS_FOTO.map((e) => e.id)).toEqual(["corteza", "hoja", "arbol", "fruto"]);
    for (const e of ETIQUETAS_FOTO) expect(e.titulo.length).toBeGreaterThan(0);
  });
  it("tiene un texto de prompt por cada etiqueta", () => {
    for (const e of ETIQUETAS_FOTO) {
      expect(ETIQUETAS_FOTO_TEXTO[e.id].length).toBeGreaterThan(0);
    }
  });
});
