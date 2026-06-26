import { describe, it, expect } from "vitest";
import { mapRowToObservation } from "@/lib/observations";

function baseRow(overrides = {}) {
  return {
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
    oculta: false,
    verificada: false,
    notas_admin: null,
    editado_en: null,
    ...overrides,
  };
}

describe("mapRowToObservation", () => {
  it("convierte snake_case a camelCase con tipos correctos", () => {
    expect(mapRowToObservation(baseRow())).toEqual({
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
      oculta: false,
      verificada: false,
      notasAdmin: null,
      editadoEn: null,
    });
  });

  it("normaliza un hospedero desconocido a 'otro'", () => {
    expect(mapRowToObservation(baseRow({ hospedero: "desconocido" })).hospedero).toBe("otro");
  });

  it("mapea oculta y verificada correctamente", () => {
    const observation = mapRowToObservation(
      baseRow({
        oculta: true,
        verificada: true,
        notas_admin: "ok",
        editado_en: "2026-06-25T00:00:00Z",
      }),
    );

    expect(observation.oculta).toBe(true);
    expect(observation.verificada).toBe(true);
    expect(observation.notasAdmin).toBe("ok");
    expect(observation.editadoEn).toBe("2026-06-25T00:00:00Z");
  });
});
