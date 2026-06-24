import { describe, it, expect } from "vitest";
import { validateObservation, type FormState } from "@/lib/validateObservation";

function base(p: Partial<FormState> = {}): FormState {
  return {
    nombreObservador: "Ana", lat: "-33.2", lng: "-70.3", hospedero: "quillay",
    hospederoOtro: "", fenologia: "en flor", altitud: "", exposicionSolar: "", cerro: "Manquehue", ...p,
  };
}

describe("validateObservation", () => {
  it("acepta un formulario válido", () => {
    expect(validateObservation(base())).toEqual([]);
  });

  it("exige nombre", () => {
    expect(validateObservation(base({ nombreObservador: "" }))).toContain("Falta el nombre del observador.");
  });

  it("exige coordenadas numéricas en rango", () => {
    expect(validateObservation(base({ lat: "abc" }))).toContain("La latitud debe ser un número válido.");
    expect(validateObservation(base({ lng: "200" }))).toContain("La longitud debe estar entre -180 y 180.");
  });

  it("exige fenología", () => {
    expect(validateObservation(base({ fenologia: "" }))).toContain("Falta la fenología/estado del ejemplar.");
  });

  it("exige hospederoOtro cuando hospedero es 'otro'", () => {
    expect(validateObservation(base({ hospedero: "otro", hospederoOtro: "" }))).toContain(
      "Indica el nombre del nuevo hospedero.",
    );
  });
});
