import { describe, it, expect } from "vitest";
import { mapRowToObservation } from "@/lib/observations";

describe("mapRowToObservation", () => {
  it("convierte snake_case a camelCase con tipos correctos", () => {
    const row = {
      id: "abc",
      nombre_observador: "Ana",
      lat: -33.21,
      lng: -70.34,
      hospedero: "quillay",
      hospedero_otro: null,
      fenologia: "en flor",
      altitud: 1200,
      exposicion_solar: "norte",
      foto_url: "https://x/foto.jpg",
      resultado_ia: null,
      cerro: "Manquehue",
      creado_en: "2026-06-24T00:00:00Z",
    };
    expect(mapRowToObservation(row)).toEqual({
      id: "abc",
      nombreObservador: "Ana",
      lat: -33.21,
      lng: -70.34,
      hospedero: "quillay",
      hospederoOtro: null,
      fenologia: "en flor",
      altitud: 1200,
      exposicionSolar: "norte",
      fotoUrl: "https://x/foto.jpg",
      cerro: "Manquehue",
      creadoEn: "2026-06-24T00:00:00Z",
    });
  });

  it("normaliza un hospedero desconocido a 'otro'", () => {
    const row = {
      id: "abc", nombre_observador: "Ana", lat: 0, lng: 0,
      hospedero: "desconocido", hospedero_otro: null, fenologia: "",
      altitud: null, exposicion_solar: null, foto_url: null,
      resultado_ia: null, cerro: null, creado_en: "2026-06-24T00:00:00Z",
    };
    expect(mapRowToObservation(row).hospedero).toBe("otro");
  });
});
