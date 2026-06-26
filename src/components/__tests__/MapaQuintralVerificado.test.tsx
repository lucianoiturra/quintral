import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Observation } from "@/lib/types";
import MapaQuintral from "@/components/MapaQuintral";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));

function obs(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "1",
    nombreObservador: "Ana",
    lat: -33.21,
    lng: -70.34,
    hospedero: "quillay",
    hospederoOtro: null,
    fenologia: "en flor",
    altitud: null,
    exposicionSolar: null,
    fotoUrl: null,
    cerro: null,
    creadoEn: "2026-06-24T00:00:00Z",
    oculta: false,
    verificada: false,
    notasAdmin: null,
    editadoEn: null,
    ...overrides,
  };
}

describe("MapaQuintral verificado", () => {
  it("muestra badge cuando verificada=true", () => {
    render(<MapaQuintral observations={[obs({ verificada: true })]} />);
    expect(screen.getByText(/Verificado/)).toBeTruthy();
  });

  it("no muestra badge cuando verificada=false", () => {
    render(<MapaQuintral observations={[obs({ verificada: false })]} />);
    expect(screen.queryByText(/Verificado/)).toBeNull();
  });
});
