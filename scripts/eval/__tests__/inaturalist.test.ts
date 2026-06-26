import { describe, it, expect } from "vitest";
import { urlsDeFotos, type INatObservation } from "../inaturalist";

describe("urlsDeFotos (pura)", () => {
  it("convierte /square. a /medium.", () => {
    const obs: INatObservation[] = [
      { id: 1, photos: [{ id: 10, url: "https://cdn/square.jpg" }] },
    ];
    expect(urlsDeFotos(obs, 5)[0].url).toBe("https://cdn/medium.jpg");
  });

  it("convierte /thumb. a /medium.", () => {
    const obs: INatObservation[] = [
      { id: 2, photos: [{ id: 20, url: "https://cdn/thumb.jpg" }] },
    ];
    expect(urlsDeFotos(obs, 5)[0].url).toBe("https://cdn/medium.jpg");
  });

  it("respeta el límite max", () => {
    const obs: INatObservation[] = [
      { id: 1, photos: [{ id: 1, url: "https://a/square.jpg" }] },
      { id: 2, photos: [{ id: 2, url: "https://b/square.jpg" }] },
      { id: 3, photos: [{ id: 3, url: "https://c/square.jpg" }] },
    ];
    expect(urlsDeFotos(obs, 2)).toHaveLength(2);
  });

  it("omite observaciones sin fotos", () => {
    const obs: INatObservation[] = [
      { id: 1, photos: [] },
      { id: 2, photos: [{ id: 20, url: "https://x/square.jpg" }] },
    ];
    expect(urlsDeFotos(obs, 5)).toHaveLength(1);
  });

  it("usa uri como fuente cuando existe", () => {
    const obs: INatObservation[] = [
      { id: 1, uri: "https://inat/obs/1", photos: [{ id: 10, url: "https://x/square.jpg" }] },
    ];
    expect(urlsDeFotos(obs, 5)[0].fuente).toBe("https://inat/obs/1");
  });

  it("construye fuente iNaturalist cuando no hay uri", () => {
    const obs: INatObservation[] = [
      { id: 42, photos: [{ id: 10, url: "https://x/square.jpg" }] },
    ];
    expect(urlsDeFotos(obs, 5)[0].fuente).toBe(
      "https://www.inaturalist.org/observations/42",
    );
  });

  it("parsea location 'lat,lng' a números en cada entrada", () => {
    const obs: INatObservation[] = [
      {
        id: 1,
        uri: "https://inat/1",
        location: "-33.45,-70.66",
        photos: [{ id: 10, url: "https://x/square.jpg" }],
      },
    ];
    const out = urlsDeFotos(obs, 5);
    expect(out[0].lat).toBeCloseTo(-33.45);
    expect(out[0].lng).toBeCloseTo(-70.66);
  });

  it("sin location deja lat/lng como undefined", () => {
    const obs: INatObservation[] = [
      { id: 2, photos: [{ id: 20, url: "https://y/square.jpg" }] },
    ];
    const out = urlsDeFotos(obs, 5);
    expect(out[0].lat).toBeUndefined();
    expect(out[0].lng).toBeUndefined();
  });
});
