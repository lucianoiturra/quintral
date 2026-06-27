import { describe, expect, it, vi } from "vitest";
import { syncPending, type SyncDeps } from "@/lib/offline/sync";
import type { PendingObservation } from "@/lib/offline/types";

function pendiente(over: Partial<PendingObservation> = {}): PendingObservation {
  return {
    id: "1",
    payload: {
      nombreObservador: "Ana", lat: -33.2, lng: -70.3, hospedero: "quillay",
      hospederoOtro: null, fenologia: "fruto", exposicionSolar: null, resultadoIa: null, cerro: null,
    },
    fotoBlob: new Blob(["x"], { type: "image/jpeg" }),
    altitudGps: 1200,
    precision: 8,
    estado: "pendiente",
    error: null,
    creadoEn: 1,
    ...over,
  };
}

function deps(over: Partial<SyncDeps> = {}): SyncDeps {
  return {
    listPending: vi.fn(async () => [pendiente()]),
    updatePending: vi.fn(async () => {}),
    removePending: vi.fn(async () => {}),
    uploadFoto: vi.fn(async () => "https://bucket/foto.jpg"),
    fetchElevation: vi.fn(async () => 1234),
    createObservation: vi.fn(async (input) => ({ id: "obs1", ...input, creadoEn: "now" } as never)),
    ...over,
  };
}

describe("syncPending", () => {
  it("sube la foto, corrige la altitud con elevación y crea la observación", async () => {
    const d = deps();
    const res = await syncPending(d);
    expect(d.uploadFoto).toHaveBeenCalledOnce();
    expect(d.createObservation).toHaveBeenCalledWith(
      expect.objectContaining({ fotoUrl: "https://bucket/foto.jpg", altitud: 1234 }),
    );
    expect(d.removePending).toHaveBeenCalledWith("1");
    expect(res.subidas).toHaveLength(1);
    expect(res.errores).toBe(0);
  });

  it("usa la altitud GPS como respaldo cuando la elevación falla", async () => {
    const d = deps({ fetchElevation: vi.fn(async () => null) });
    await syncPending(d);
    expect(d.createObservation).toHaveBeenCalledWith(expect.objectContaining({ altitud: 1200 }));
  });

  it("marca el registro como error y no lo borra si falla la subida", async () => {
    const d = deps({ createObservation: vi.fn(async () => { throw new Error("boom"); }) });
    const res = await syncPending(d);
    expect(d.updatePending).toHaveBeenCalledWith("1", expect.objectContaining({ estado: "error" }));
    expect(d.removePending).not.toHaveBeenCalled();
    expect(res.errores).toBe(1);
    expect(res.subidas).toHaveLength(0);
  });

  it("el fallo de un registro no detiene a los demás", async () => {
    const a = pendiente({ id: "a" });
    const b = pendiente({ id: "b" });
    let n = 0;
    const d = deps({
      listPending: vi.fn(async () => [a, b]),
      createObservation: vi.fn(async (input) => {
        n += 1;
        if (n === 1) throw new Error("falla a");
        return { id: "obsB", ...input } as never;
      }),
    });
    const res = await syncPending(d);
    expect(res.errores).toBe(1);
    expect(res.subidas).toHaveLength(1);
    expect(d.removePending).toHaveBeenCalledWith("b");
  });
});
