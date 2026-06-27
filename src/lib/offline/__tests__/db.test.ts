import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { addPending, listPending, updatePending, removePending } from "@/lib/offline/db";
import type { PendingPayload } from "@/lib/offline/types";

const payload: PendingPayload = {
  nombreObservador: "Ana",
  lat: -33.2,
  lng: -70.3,
  hospedero: "quillay",
  hospederoOtro: null,
  fenologia: "fruto",
  exposicionSolar: null,
  resultadoIa: null,
  cerro: "Manquehue",
};

async function limpiar() {
  for (const p of await listPending()) await removePending(p.id);
}

describe("cola de observaciones pendientes", () => {
  beforeEach(limpiar);

  it("agrega y lista un pendiente con estado inicial", async () => {
    const creado = await addPending({ payload, fotoBlob: null, altitudGps: 1200, precision: 8 });
    expect(creado.id).toBeTruthy();
    expect(creado.estado).toBe("pendiente");
    const lista = await listPending();
    expect(lista).toHaveLength(1);
    expect(lista[0].altitudGps).toBe(1200);
    expect(lista[0].payload.nombreObservador).toBe("Ana");
  });

  it("actualiza el estado de un pendiente", async () => {
    const creado = await addPending({ payload, fotoBlob: null, altitudGps: null, precision: null });
    await updatePending(creado.id, { estado: "error", error: "sin red" });
    const [p] = await listPending();
    expect(p.estado).toBe("error");
    expect(p.error).toBe("sin red");
  });

  it("elimina un pendiente", async () => {
    const creado = await addPending({ payload, fotoBlob: null, altitudGps: null, precision: null });
    await removePending(creado.id);
    expect(await listPending()).toHaveLength(0);
  });

  it("ordena por fecha de creación ascendente", async () => {
    let t = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => t++);
    const a = await addPending({ payload, fotoBlob: null, altitudGps: null, precision: null });
    const b = await addPending({ payload, fotoBlob: null, altitudGps: null, precision: null });
    vi.restoreAllMocks();
    const lista = await listPending();
    expect(lista.map((p) => p.id)).toEqual([a.id, b.id]);
  });
});
