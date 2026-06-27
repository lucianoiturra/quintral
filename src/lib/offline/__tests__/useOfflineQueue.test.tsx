import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { useOfflineQueue } from "@/lib/offline/useOfflineQueue";
import { listPending, removePending } from "@/lib/offline/db";

vi.mock("@/lib/offline/sync", () => ({
  runSync: vi.fn(async () => ({ subidas: [{ id: "obs1" }], errores: 0 })),
}));

const entrada = {
  payload: {
    nombreObservador: "Ana", lat: -33.2, lng: -70.3, hospedero: "quillay" as const,
    hospederoOtro: null, fenologia: "fruto", exposicionSolar: null, resultadoIa: null, cerro: null,
  },
  fotoBlob: null,
  altitudGps: 1200,
  precision: 8,
};

describe("useOfflineQueue", () => {
  beforeEach(async () => {
    for (const p of await listPending()) await removePending(p.id);
    vi.stubGlobal("navigator", { ...navigator, onLine: false });
  });

  it("encola y refresca la lista de pendientes", async () => {
    const { result } = renderHook(() => useOfflineQueue(vi.fn()));
    await act(async () => {
      await result.current.encolar(entrada);
    });
    await waitFor(() => expect(result.current.pendientes).toHaveLength(1));
  });

  it("al sincronizar llama onSynced con las observaciones subidas", async () => {
    const onSynced = vi.fn();
    const { result } = renderHook(() => useOfflineQueue(onSynced));
    await act(async () => {
      await result.current.sincronizar();
    });
    expect(onSynced).toHaveBeenCalledWith({ id: "obs1" });
  });
});
