import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminPanel from "@/app/admin/AdminPanel";

const dupA = {
  id: "a",
  nombreObservador: "Ana",
  lat: -33.2,
  lng: -70.3,
  hospedero: "quillay",
  hospederoOtro: null,
  fenologia: "en flor",
  altitud: null,
  exposicionSolar: null,
  fotoUrl: null,
  cerro: "Manquehue",
  creadoEn: "2026-06-20T09:00:00Z",
  oculta: false,
  verificada: false,
  notasAdmin: null,
  editadoEn: null,
};
const dupB = { ...dupA, id: "b", creadoEn: "2026-06-20T10:00:00Z" };

describe("flujo borrar duplicados", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/admin/observaciones") {
          return { ok: true, json: async () => [dupA, dupB] } as Response;
        }
        if (url === "/api/admin/log") {
          return { ok: true, json: async () => [] } as Response;
        }
        if (url === "/api/admin/observaciones/bulk-delete") {
          return { ok: true, json: async () => ({ ok: true, borradas: 1 }) } as Response;
        }
        throw new Error(`fetch inesperado: ${url}`);
      }),
    );
    vi.stubGlobal("crypto", { randomUUID: () => "uuid" });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("muestra error y no queda congelado si el borrado falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/admin/observaciones") {
          return { ok: true, json: async () => [dupA, dupB] } as Response;
        }
        if (url === "/api/admin/log") {
          return { ok: true, json: async () => [] } as Response;
        }
        if (url === "/api/admin/observaciones/bulk-delete") {
          throw new TypeError("Failed to fetch");
        }
        throw new Error(`fetch inesperado: ${url}`);
      }),
    );

    render(<AdminPanel />);
    fireEvent.click(await screen.findByRole("button", { name: /Borrar 1 duplicado/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Sí, borrar duplicados/i }));

    // Debe volver a habilitar el botón (no quedar congelado en "Borrando…")
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Borrando/i })).not.toBeInTheDocument(),
    );
    // Y debe mostrar un error visible
    expect(screen.getByText(/No se pudieron borrar/i)).toBeInTheDocument();
  });

  it("borra el duplicado al confirmar", async () => {
    render(<AdminPanel />);

    const abrir = await screen.findByRole("button", { name: /Borrar 1 duplicado/i });
    fireEvent.click(abrir);

    const confirmar = await screen.findByRole("button", { name: /Sí, borrar duplicados/i });
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(screen.getByText(/Se borraron 1 registro/i)).toBeInTheDocument(),
    );

    const bulk = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === "/api/admin/observaciones/bulk-delete",
    );
    expect(bulk).toBeTruthy();
    expect(JSON.parse((bulk![1] as RequestInit).body as string)).toEqual({ ids: ["b"] });
  });
});
