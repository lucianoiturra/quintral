import { describe, it, expect } from "vitest";
import { ZONAS, zonaPorId, zonaPorLatitud } from "@/lib/zonas";

describe("ZONAS", () => {
  it("tiene las 3 macrozonas con id, etiqueta y pista", () => {
    expect(ZONAS.map((z) => z.id)).toEqual(["norte", "centro", "sur"]);
    for (const z of ZONAS) {
      expect(z.etiqueta.length).toBeGreaterThan(0);
      expect(z.pista.length).toBeGreaterThan(0);
    }
  });
});

describe("zonaPorId", () => {
  it("devuelve la zona correcta", () => {
    expect(zonaPorId("centro")?.id).toBe("centro");
  });
  it("devuelve undefined para id inexistente", () => {
    expect(zonaPorId("antartica")).toBeUndefined();
  });
});

describe("zonaPorLatitud", () => {
  it("norte por encima de -31.5", () => {
    expect(zonaPorLatitud(-29).id).toBe("norte");
  });
  it("centro entre -31.5 y -36", () => {
    expect(zonaPorLatitud(-33).id).toBe("centro");
  });
  it("sur en -36 o más al sur", () => {
    expect(zonaPorLatitud(-40).id).toBe("sur");
  });
  it("borde -31.5 cae en centro (no norte)", () => {
    expect(zonaPorLatitud(-31.5).id).toBe("centro");
  });
  it("borde -36 cae en sur (no centro)", () => {
    expect(zonaPorLatitud(-36).id).toBe("sur");
  });
});
