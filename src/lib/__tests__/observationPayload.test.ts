import { describe, expect, it } from "vitest";
import { normalizeObservationInput } from "@/lib/observationPayload";

describe("normalizeObservationInput", () => {
  it("acepta un payload valido", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const result = normalizeObservationInput({
      nombreObservador: "Ana",
      lat: -33.2,
      lng: -70.3,
      hospedero: "quillay",
      hospederoOtro: null,
      fenologia: "En flor",
      altitud: 1200,
      exposicionSolar: "norte",
      fotoUrl: "https://example.supabase.co/storage/v1/object/public/fotos/abc.jpg",
      resultadoIa: { ok: true },
      cerro: "Manquehue",
    });

    expect(result.errors).toEqual([]);
    expect(result.value?.nombreObservador).toBe("Ana");
  });

  it("rechaza URLs de foto fuera del bucket permitido", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const result = normalizeObservationInput({
      nombreObservador: "Ana",
      lat: -33.2,
      lng: -70.3,
      hospedero: "quillay",
      fenologia: "En flor",
      fotoUrl: "https://evil.example/xss.svg",
      resultadoIa: null,
    });

    expect(result.value).toBeNull();
    expect(result.errors).toContain("La URL de la foto no pertenece al bucket permitido.");
  });

  it("exige hospederoOtro cuando el hospedero es otro", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const result = normalizeObservationInput({
      nombreObservador: "Ana",
      lat: -33.2,
      lng: -70.3,
      hospedero: "otro",
      fenologia: "En flor",
      resultadoIa: null,
    });

    expect(result.value).toBeNull();
    expect(result.errors).toContain("Indica el nombre del nuevo hospedero.");
  });
});
