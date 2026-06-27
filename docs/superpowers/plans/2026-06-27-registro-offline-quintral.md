# Registro offline de quintrales — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar observaciones de quintral en cerros sin señal: la app abre offline, guarda foto + datos + altitud GPS localmente y los sube solo al volver la conexión, corrigiendo la altitud con un servicio de elevación.

**Architecture:** Patrón offline-first. Todo registro se guarda primero en IndexedDB (cola local) y luego un gestor de sincronización lo sube cuando hay red. La app se vuelve una PWA instalable (Serwist) para abrir sin señal. La altitud GPS se captura offline como respaldo y se corrige al sincronizar vía un endpoint proxy a Open-Meteo.

**Tech Stack:** Next.js 15 (App Router) + React 19, TypeScript, Supabase, Leaflet, Vitest + jsdom + @testing-library/react. Nuevas deps: `idb`, `@serwist/next` + `serwist`, y dev `fake-indexeddb`.

## Global Constraints

- Responder/copy en **español** (el público es chileno; proyecto escolar de ciencias).
- La **altitud** se guarda como **entero** en rango [-500, 10000] (lo valida `normalizeObservationInput` en [src/lib/observationPayload.ts](../../../src/lib/observationPayload.ts)). Redondear siempre antes de enviar.
- El cuerpo que acepta el backend es `ObservationInput` (ver [src/lib/observationPayload.ts:5-17](../../../src/lib/observationPayload.ts#L5-L17)). No cambiar su forma.
- No tocar el esquema de Supabase (precisión GPS / fuente de altitud quedan fuera de alcance).
- Seguir el patrón de tests existente: Vitest con `globals: true`, entorno `jsdom`, alias `@` → `src` (ver [vitest.config.ts](../../../vitest.config.ts)).
- Tests de API route: importar `POST`/`GET` desde el módulo route y construir `Request` a mano (ver [src/app/api/identify/__tests__/route.test.ts](../../../src/app/api/identify/__tests__/route.test.ts)).
- Comando de test: `npm test` (= `vitest run`). Para un archivo: `npx vitest run <ruta>`.

---

## File Structure

- `src/lib/offline/types.ts` — tipos de la cola (`PendingObservation`, `PendingPayload`, `EstadoPendiente`).
- `src/lib/offline/db.ts` — acceso a IndexedDB con `idb` (add/list/update/remove).
- `src/lib/elevation.ts` — cliente `fetchElevation(lat, lng)` que pega a `/api/elevation`.
- `src/app/api/elevation/route.ts` — endpoint GET proxy a Open-Meteo.
- `src/lib/offline/sync.ts` — `syncPending(deps)` (lógica pura con dependencias inyectadas) + `runSync()` (cablea las dependencias reales).
- `src/lib/offline/useOnlineStatus.ts` — hook de estado de conexión.
- `src/lib/offline/useOfflineQueue.ts` — hook que une cola + sincronización para la UI.
- `src/components/ConnectionBadge.tsx` — indicador "Sin conexión" en el Nav.
- `src/components/PendingPanel.tsx` — panel de pendientes + botón "Sincronizar ahora".
- `src/components/PrepOffline.tsx` — checklist de preparación + botón "Instalar app".
- `src/app/sw.ts` — service worker (Serwist).
- `public/manifest.webmanifest` — manifiesto PWA.
- Modificar: [src/components/ContributeForm.tsx](../../../src/components/ContributeForm.tsx), [src/components/HomeClient.tsx](../../../src/components/HomeClient.tsx), [src/components/Nav.tsx](../../../src/components/Nav.tsx), [next.config.mjs](../../../next.config.mjs).

---

## Task 1: Almacén local en IndexedDB

**Files:**
- Create: `src/lib/offline/types.ts`
- Create: `src/lib/offline/db.ts`
- Test: `src/lib/offline/__tests__/db.test.ts`

**Interfaces:**
- Consumes: `ObservationInput` de [src/lib/observationPayload.ts](../../../src/lib/observationPayload.ts).
- Produces:
  - `type PendingPayload = Omit<ObservationInput, "fotoUrl" | "altitud">`
  - `type EstadoPendiente = "pendiente" | "subiendo" | "error"`
  - `interface PendingObservation { id: string; payload: PendingPayload; fotoBlob: Blob | null; altitudGps: number | null; precision: number | null; estado: EstadoPendiente; error: string | null; creadoEn: number }`
  - `addPending(entrada: { payload: PendingPayload; fotoBlob: Blob | null; altitudGps: number | null; precision: number | null }): Promise<PendingObservation>`
  - `listPending(): Promise<PendingObservation[]>` (orden ascendente por `creadoEn`)
  - `updatePending(id: string, patch: Partial<PendingObservation>): Promise<void>`
  - `removePending(id: string): Promise<void>`

- [ ] **Step 1: Instalar dependencias**

```bash
npm install idb
npm install -D fake-indexeddb
```

- [ ] **Step 2: Crear los tipos de la cola**

Create `src/lib/offline/types.ts`:

```ts
import type { ObservationInput } from "@/lib/observationPayload";

/** Campos del registro que se conocen en terreno (sin foto ni altitud final). */
export type PendingPayload = Omit<ObservationInput, "fotoUrl" | "altitud">;

export type EstadoPendiente = "pendiente" | "subiendo" | "error";

export interface PendingObservation {
  id: string;
  payload: PendingPayload;
  fotoBlob: Blob | null;
  altitudGps: number | null;
  precision: number | null;
  estado: EstadoPendiente;
  error: string | null;
  creadoEn: number;
}
```

- [ ] **Step 3: Escribir el test que falla**

Create `src/lib/offline/__tests__/db.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
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
    const a = await addPending({ payload, fotoBlob: null, altitudGps: null, precision: null });
    const b = await addPending({ payload, fotoBlob: null, altitudGps: null, precision: null });
    const lista = await listPending();
    expect(lista.map((p) => p.id)).toEqual([a.id, b.id]);
  });
});
```

- [ ] **Step 4: Verificar que falla**

Run: `npx vitest run src/lib/offline/__tests__/db.test.ts`
Expected: FAIL (no existe `@/lib/offline/db`).

- [ ] **Step 5: Implementar el almacén**

Create `src/lib/offline/db.ts`:

```ts
import { openDB, type IDBPDatabase } from "idb";
import type { PendingObservation, PendingPayload } from "@/lib/offline/types";

const DB_NAME = "quintral-offline";
const STORE = "observaciones_pendientes";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

function nuevoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function addPending(entrada: {
  payload: PendingPayload;
  fotoBlob: Blob | null;
  altitudGps: number | null;
  precision: number | null;
}): Promise<PendingObservation> {
  const registro: PendingObservation = {
    id: nuevoId(),
    payload: entrada.payload,
    fotoBlob: entrada.fotoBlob,
    altitudGps: entrada.altitudGps,
    precision: entrada.precision,
    estado: "pendiente",
    error: null,
    creadoEn: Date.now(),
  };
  const db = await getDb();
  await db.put(STORE, registro);
  return registro;
}

export async function listPending(): Promise<PendingObservation[]> {
  const db = await getDb();
  const todos = (await db.getAll(STORE)) as PendingObservation[];
  return todos.sort((a, b) => a.creadoEn - b.creadoEn);
}

export async function updatePending(
  id: string,
  patch: Partial<PendingObservation>,
): Promise<void> {
  const db = await getDb();
  const actual = (await db.get(STORE, id)) as PendingObservation | undefined;
  if (!actual) return;
  await db.put(STORE, { ...actual, ...patch, id });
}

export async function removePending(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}
```

- [ ] **Step 6: Verificar que pasa**

Run: `npx vitest run src/lib/offline/__tests__/db.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/offline/types.ts src/lib/offline/db.ts src/lib/offline/__tests__/db.test.ts package.json package-lock.json
git commit -m "feat: cola local de observaciones pendientes en IndexedDB"
```

---

## Task 2: Endpoint y cliente de elevación

**Files:**
- Create: `src/app/api/elevation/route.ts`
- Create: `src/lib/elevation.ts`
- Test: `src/app/api/elevation/__tests__/route.test.ts`
- Test: `src/lib/__tests__/elevation.test.ts`

**Interfaces:**
- Produces:
  - `GET(req: Request): Promise<Response>` en la ruta — responde `{ elevation: number }` (entero) o `{ error: string }` con status 400/502.
  - `fetchElevation(lat: number, lng: number): Promise<number | null>` — entero o `null` si falla.

- [ ] **Step 1: Escribir el test del endpoint que falla**

Create `src/app/api/elevation/__tests__/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/elevation/route";

function req(qs: string): Request {
  return new Request(`http://localhost/api/elevation${qs}`);
}

describe("GET /api/elevation", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("devuelve la elevación redondeada", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ elevation: [1234.7] }), { status: 200 }),
    );
    const res = await GET(req("?lat=-33.2&lng=-70.3"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ elevation: 1235 });
  });

  it("rechaza coordenadas inválidas con 400", async () => {
    const res = await GET(req("?lat=abc&lng=-70.3"));
    expect(res.status).toBe(400);
  });

  it("devuelve 502 si el proveedor falla", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    const res = await GET(req("?lat=-33.2&lng=-70.3"));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/app/api/elevation/__tests__/route.test.ts`
Expected: FAIL (no existe la ruta).

- [ ] **Step 3: Implementar el endpoint**

Create `src/app/api/elevation/route.ts`:

```ts
const PROVEEDOR = "https://api.open-meteo.com/v1/elevation";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return Response.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  try {
    const res = await fetch(`${PROVEEDOR}?latitude=${lat}&longitude=${lng}`);
    if (!res.ok) return Response.json({ error: "Proveedor de elevación no disponible." }, { status: 502 });
    const data = (await res.json()) as { elevation?: number[] };
    const valor = data.elevation?.[0];
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      return Response.json({ error: "Respuesta de elevación inválida." }, { status: 502 });
    }
    return Response.json({ elevation: Math.round(valor) });
  } catch {
    return Response.json({ error: "Proveedor de elevación no disponible." }, { status: 502 });
  }
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/app/api/elevation/__tests__/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Escribir el test del cliente que falla**

Create `src/lib/__tests__/elevation.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchElevation } from "@/lib/elevation";

describe("fetchElevation", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("devuelve el entero de elevación cuando responde OK", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ elevation: 1235 }), { status: 200 }),
    );
    expect(await fetchElevation(-33.2, -70.3)).toBe(1235);
  });

  it("devuelve null cuando el endpoint falla", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("x", { status: 502 }));
    expect(await fetchElevation(-33.2, -70.3)).toBeNull();
  });

  it("devuelve null cuando fetch lanza", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(await fetchElevation(-33.2, -70.3)).toBeNull();
  });
});
```

- [ ] **Step 6: Verificar que falla**

Run: `npx vitest run src/lib/__tests__/elevation.test.ts`
Expected: FAIL (no existe `@/lib/elevation`).

- [ ] **Step 7: Implementar el cliente**

Create `src/lib/elevation.ts`:

```ts
/** Pide la altitud del terreno al endpoint propio. Devuelve null si no hay red o falla. */
export async function fetchElevation(lat: number, lng: number): Promise<number | null> {
  try {
    const res = await fetch(`/api/elevation?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { elevation?: number };
    return typeof data.elevation === "number" ? data.elevation : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 8: Verificar que pasa**

Run: `npx vitest run src/lib/__tests__/elevation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/app/api/elevation src/lib/elevation.ts src/lib/__tests__/elevation.test.ts
git commit -m "feat: endpoint y cliente de elevación (Open-Meteo)"
```

---

## Task 3: Gestor de sincronización

**Files:**
- Create: `src/lib/offline/sync.ts`
- Test: `src/lib/offline/__tests__/sync.test.ts`

**Interfaces:**
- Consumes: `listPending`, `updatePending`, `removePending` (Task 1); `fetchElevation` (Task 2); `uploadFoto` de [src/lib/uploadFoto.ts](../../../src/lib/uploadFoto.ts); `createObservation` de [src/lib/observations.ts](../../../src/lib/observations.ts); `ObservationInput`; `Observation` de [src/lib/types](../../../src/lib/types.ts).
- Produces:
  - `interface SyncDeps { listPending; updatePending; removePending; uploadFoto: (f: File) => Promise<string>; fetchElevation: (lat: number, lng: number) => Promise<number | null>; createObservation: (input: ObservationInput) => Promise<Observation>; }`
  - `interface SyncResult { subidas: Observation[]; errores: number }`
  - `syncPending(deps: SyncDeps): Promise<SyncResult>` — lógica pura.
  - `runSync(): Promise<SyncResult>` — cablea las dependencias reales.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/offline/__tests__/sync.test.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/offline/__tests__/sync.test.ts`
Expected: FAIL (no existe `@/lib/offline/sync`).

- [ ] **Step 3: Implementar el gestor**

Create `src/lib/offline/sync.ts`:

```ts
import type { Observation } from "@/lib/types";
import type { ObservationInput } from "@/lib/observationPayload";
import type { PendingObservation } from "@/lib/offline/types";
import { listPending, updatePending, removePending } from "@/lib/offline/db";
import { fetchElevation } from "@/lib/elevation";
import { uploadFoto } from "@/lib/uploadFoto";
import { createObservation } from "@/lib/observations";

export interface SyncDeps {
  listPending: () => Promise<PendingObservation[]>;
  updatePending: (id: string, patch: Partial<PendingObservation>) => Promise<void>;
  removePending: (id: string) => Promise<void>;
  uploadFoto: (file: File) => Promise<string>;
  fetchElevation: (lat: number, lng: number) => Promise<number | null>;
  createObservation: (input: ObservationInput) => Promise<Observation>;
}

export interface SyncResult {
  subidas: Observation[];
  errores: number;
}

export async function syncPending(deps: SyncDeps): Promise<SyncResult> {
  const pendientes = await deps.listPending();
  const subidas: Observation[] = [];
  let errores = 0;

  for (const p of pendientes) {
    try {
      await deps.updatePending(p.id, { estado: "subiendo", error: null });

      const fotoUrl = p.fotoBlob
        ? await deps.uploadFoto(new File([p.fotoBlob], "foto.jpg", { type: p.fotoBlob.type || "image/jpeg" }))
        : null;

      const elevacion = await deps.fetchElevation(p.payload.lat, p.payload.lng);
      const altitud = elevacion ?? p.altitudGps;

      const obs = await deps.createObservation({ ...p.payload, fotoUrl, altitud });
      await deps.removePending(p.id);
      subidas.push(obs);
    } catch (err) {
      errores += 1;
      await deps.updatePending(p.id, {
        estado: "error",
        error: err instanceof Error ? err.message : "Error al subir.",
      });
    }
  }

  return { subidas, errores };
}

export function runSync(): Promise<SyncResult> {
  return syncPending({ listPending, updatePending, removePending, uploadFoto, fetchElevation, createObservation });
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/offline/__tests__/sync.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/offline/sync.ts src/lib/offline/__tests__/sync.test.ts
git commit -m "feat: gestor de sincronización de la cola offline"
```

---

## Task 4: Estado de conexión e indicador en el Nav

**Files:**
- Create: `src/lib/offline/useOnlineStatus.ts`
- Create: `src/components/ConnectionBadge.tsx`
- Modify: `src/components/Nav.tsx` (insertar `<ConnectionBadge />` dentro de `.nav-inner`)
- Test: `src/lib/offline/__tests__/useOnlineStatus.test.tsx`

**Interfaces:**
- Produces: `useOnlineStatus(): boolean` — `true` si hay conexión; reacciona a los eventos `online`/`offline`.

- [ ] **Step 1: Escribir el test que falla**

Create `src/lib/offline/__tests__/useOnlineStatus.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

describe("useOnlineStatus", () => {
  it("refleja navigator.onLine inicial y los eventos", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/offline/__tests__/useOnlineStatus.test.tsx`
Expected: FAIL (no existe el hook).

- [ ] **Step 3: Implementar el hook**

Create `src/lib/offline/useOnlineStatus.ts`:

```ts
"use client";
import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const subir = () => setOnline(true);
    const bajar = () => setOnline(false);
    window.addEventListener("online", subir);
    window.addEventListener("offline", bajar);
    return () => {
      window.removeEventListener("online", subir);
      window.removeEventListener("offline", bajar);
    };
  }, []);

  return online;
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/offline/__tests__/useOnlineStatus.test.tsx`
Expected: PASS.

- [ ] **Step 5: Crear el indicador**

Create `src/components/ConnectionBadge.tsx`:

```tsx
"use client";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

export default function ConnectionBadge() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <span className="conn-badge" role="status" aria-live="polite">
      <span className="conn-dot" aria-hidden="true" /> Sin conexión
    </span>
  );
}
```

- [ ] **Step 6: Montar el indicador en el Nav**

In `src/components/Nav.tsx`, add the import after line 2:

```tsx
import ConnectionBadge from "@/components/ConnectionBadge";
```

Then place it right before the closing `</div>` of `.nav-inner` (after the `#nav-menu` div, currently line 83):

```tsx
        <ConnectionBadge />
      </div>
    </nav>
```

- [ ] **Step 7: Estilos del indicador**

In `src/app/globals.css`, append:

```css
.conn-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #b45309;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
}
.conn-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #f97316;
}
```

- [ ] **Step 8: Verificar la suite completa**

Run: `npm test`
Expected: PASS (todas las suites).

- [ ] **Step 9: Commit**

```bash
git add src/lib/offline/useOnlineStatus.ts src/components/ConnectionBadge.tsx src/components/Nav.tsx src/app/globals.css src/lib/offline/__tests__/useOnlineStatus.test.tsx
git commit -m "feat: indicador de estado de conexión en el Nav"
```

---

## Task 5: Captura de altitud GPS y guardado offline-first en el formulario

**Files:**
- Modify: `src/components/ContributeForm.tsx`
- Test: `src/components/__tests__/ContributeForm.test.tsx`

**Interfaces:**
- Consumes: `PendingPayload` (Task 1); `addPending` se usa vía un prop, no directo.
- Produces: el componente acepta un nuevo prop `onQueue: (entrada: { payload: PendingPayload; fotoBlob: Blob | null; altitudGps: number | null; precision: number | null }) => Promise<void>`. Se mantiene `onCreated` para compatibilidad de tipos pero ya **no** se llama desde aquí (la subida la hace la sincronización). El prop `onCreated` se elimina de la firma y su responsabilidad pasa al panel de pendientes (Task 6).

> Nota para el implementador: este task cambia la firma de `ContributeForm`. [HomeClient.tsx](../../../src/components/HomeClient.tsx) dejará de compilar hasta completar el Task 6, que recablea el padre. Es esperado; el `npm test` de este task corre solo el archivo de test del componente. La verificación de tipos del proyecto se hace al final del Task 6.

- [ ] **Step 1: Escribir el test que falla**

Create `src/components/__tests__/ContributeForm.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContributeForm from "@/components/ContributeForm";

describe("ContributeForm (offline-first)", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({
            coords: { latitude: -33.2, longitude: -70.3, altitude: 1180.6, accuracy: 7, altitudeAccuracy: 12 },
          } as GeolocationPosition),
      },
    });
  });

  it("captura altitud GPS al usar la ubicación", () => {
    render(<ContributeForm prefill={null} onQueue={vi.fn(async () => {})} />);
    fireEvent.click(screen.getByText("Usar mi ubicación"));
    expect((screen.getByPlaceholderText("-33.21") as HTMLInputElement).value).toBe("-33.2");
    expect((screen.getByPlaceholderText("1200") as HTMLInputElement).value).toBe("1181");
  });

  it("encola la observación al enviar (no la sube directo)", async () => {
    const onQueue = vi.fn(async () => {});
    render(<ContributeForm prefill={null} onQueue={onQueue} />);
    fireEvent.change(screen.getByPlaceholderText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText("Usar mi ubicación"));
    fireEvent.change(screen.getByPlaceholderText("Floración, fruto…"), { target: { value: "fruto" } });
    fireEvent.click(screen.getByText("Enviar observación"));
    await waitFor(() => expect(onQueue).toHaveBeenCalledOnce());
    const arg = onQueue.mock.calls[0][0];
    expect(arg.altitudGps).toBe(1181);
    expect(arg.precision).toBe(7);
    expect(arg.payload.nombreObservador).toBe("Ana");
    await screen.findByText(/se subirá al volver/i);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/components/__tests__/ContributeForm.test.tsx`
Expected: FAIL (el componente aún usa `onCreated`/`createObservation`).

- [ ] **Step 3: Cambiar la firma y los imports del componente**

In `src/components/ContributeForm.tsx`, replace the imports block (lines 1-7) with:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { Host } from "@/lib/types";
import { HOSPEDEROS, etiquetaHospedero } from "@/lib/hosts";
import { validateObservation, type FormState } from "@/lib/validateObservation";
import type { PendingPayload } from "@/lib/offline/types";
```

Replace the component signature and props (lines 47-60) with:

```tsx
export default function ContributeForm({
  prefill,
  onQueue,
}: {
  prefill: Prefill | null;
  onQueue: (entrada: {
    payload: PendingPayload;
    fotoBlob: Blob | null;
    altitudGps: number | null;
    precision: number | null;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(VACIO);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [resultadoIa, setResultadoIa] = useState<unknown>(null);
  const [altitudGps, setAltitudGps] = useState<number | null>(null);
  const [precision, setPrecision] = useState<number | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
```

- [ ] **Step 4: Capturar altitud y precisión en `usarUbicacion`**

Replace `usarUbicacion` (lines 75-83) with:

```tsx
  function usarUbicacion() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        set("lat", String(pos.coords.latitude));
        set("lng", String(pos.coords.longitude));
        if (typeof pos.coords.altitude === "number" && Number.isFinite(pos.coords.altitude)) {
          const alt = Math.round(pos.coords.altitude);
          setAltitudGps(alt);
          set("altitud", String(alt));
        }
        setPrecision(typeof pos.coords.accuracy === "number" ? Math.round(pos.coords.accuracy) : null);
      },
      () => setErrores((prev) => [...prev, "No se pudo obtener la ubicación; ingrésala manualmente."]),
    );
  }
```

- [ ] **Step 5: Reescribir `enviar` para encolar**

Replace `enviar` (lines 85-118) with:

```tsx
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOk(false);
    const errs = validateObservation(form);
    setErrores(errs);
    if (errs.length) return;
    setEnviando(true);
    try {
      const payload: PendingPayload = {
        nombreObservador: form.nombreObservador.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        hospedero: form.hospedero,
        hospederoOtro: form.hospedero === "otro" ? form.hospederoOtro.trim() : null,
        fenologia: form.fenologia.trim(),
        exposicionSolar: form.exposicionSolar.trim() || null,
        resultadoIa,
        cerro: form.cerro.trim() || null,
      };
      await onQueue({
        payload,
        fotoBlob: fotoArchivo,
        altitudGps: form.altitud.trim() ? Number(form.altitud) : altitudGps,
        precision,
      });
      setOk(true);
      setForm(VACIO);
      setFotoUrl(null);
      setFotoArchivo(null);
      setResultadoIa(null);
      setAltitudGps(null);
      setPrecision(null);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : "Error al guardar el registro."]);
    } finally {
      setEnviando(false);
    }
  }
```

> Note: `fotoUrl` (de prefill por identificación) ya no se sube aquí. Si viene una foto desde la identificación como `File` (`fotoArchivo`), se encola. El caso de prefill con solo `fotoUrl` (URL ya subida) queda fuera del flujo offline; se mantiene mostrando el aviso de "foto adjunta" pero no se reenvía. Mantener el estado `fotoUrl` solo para ese aviso.

- [ ] **Step 6: Actualizar el mensaje de confirmación**

Replace the success line (line 217) with:

```tsx
          {ok && (
            <p className="alert alert--ok">
              ✓ Guardado en tu teléfono. Sin señal se subirá al volver la conexión.
            </p>
          )}
```

- [ ] **Step 7: Verificar que pasa**

Run: `npx vitest run src/components/__tests__/ContributeForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add src/components/ContributeForm.tsx src/components/__tests__/ContributeForm.test.tsx
git commit -m "feat: ContributeForm captura altitud GPS y encola offline-first"
```

---

## Task 6: Hook de cola, panel de pendientes y recableado del padre

**Files:**
- Create: `src/lib/offline/useOfflineQueue.ts`
- Create: `src/components/PendingPanel.tsx`
- Modify: `src/components/HomeClient.tsx`
- Test: `src/lib/offline/__tests__/useOfflineQueue.test.tsx`

**Interfaces:**
- Consumes: `addPending`, `listPending` (Task 1); `runSync` (Task 3); `Observation`.
- Produces:
  - `useOfflineQueue(onSynced: (obs: Observation) => void): { pendientes: PendingObservation[]; encolar: (entrada) => Promise<void>; sincronizar: () => Promise<void>; sincronizando: boolean }` donde `entrada` es el mismo objeto que recibe `onQueue` del Task 5.
  - `<PendingPanel pendientes sincronizar sincronizando />`.

- [ ] **Step 1: Escribir el test del hook que falla**

Create `src/lib/offline/__tests__/useOfflineQueue.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/offline/__tests__/useOfflineQueue.test.tsx`
Expected: FAIL (no existe el hook).

- [ ] **Step 3: Implementar el hook**

Create `src/lib/offline/useOfflineQueue.ts`:

```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import type { PendingObservation, PendingPayload } from "@/lib/offline/types";
import { addPending, listPending } from "@/lib/offline/db";
import { runSync } from "@/lib/offline/sync";

type Entrada = {
  payload: PendingPayload;
  fotoBlob: Blob | null;
  altitudGps: number | null;
  precision: number | null;
};

export function useOfflineQueue(onSynced: (obs: Observation) => void) {
  const [pendientes, setPendientes] = useState<PendingObservation[]>([]);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescar = useCallback(async () => {
    setPendientes(await listPending());
  }, []);

  const encolar = useCallback(
    async (entrada: Entrada) => {
      await addPending(entrada);
      await refrescar();
    },
    [refrescar],
  );

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const res = await runSync();
      res.subidas.forEach(onSynced);
      await refrescar();
    } finally {
      setSincronizando(false);
    }
  }, [onSynced, refrescar]);

  useEffect(() => {
    refrescar();
    if (navigator.onLine) sincronizar();
    const onOnline = () => sincronizar();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refrescar, sincronizar]);

  return { pendientes, encolar, sincronizar, sincronizando };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/offline/__tests__/useOfflineQueue.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Crear el panel de pendientes**

Create `src/components/PendingPanel.tsx`:

```tsx
"use client";
import type { PendingObservation } from "@/lib/offline/types";

const ETIQUETA: Record<PendingObservation["estado"], string> = {
  pendiente: "Pendiente de subir",
  subiendo: "Subiendo…",
  error: "Error, se reintentará",
};

export default function PendingPanel({
  pendientes,
  sincronizar,
  sincronizando,
}: {
  pendientes: PendingObservation[];
  sincronizar: () => Promise<void>;
  sincronizando: boolean;
}) {
  if (pendientes.length === 0) return null;
  return (
    <div className="pending-panel card card-pad" role="status" aria-live="polite">
      <div className="pending-head">
        <strong>Pendientes de subir: {pendientes.length}</strong>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => void sincronizar()}
          disabled={sincronizando}
        >
          {sincronizando ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
      </div>
      <ul className="pending-list">
        {pendientes.map((p) => (
          <li key={p.id}>
            <span>{p.payload.cerro || p.payload.nombreObservador || "Observación"}</span>
            <span className={`pending-state pending-state--${p.estado}`}>{ETIQUETA[p.estado]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Recablear HomeClient**

Replace the full contents of `src/components/HomeClient.tsx` with:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import { fetchObservations } from "@/lib/observations";
import { useOfflineQueue } from "@/lib/offline/useOfflineQueue";
import IdentifySection from "@/components/IdentifySection";
import MapSection from "@/components/MapSection";
import CompararSection from "@/components/CompararSection";
import PrediccionSection from "@/components/PrediccionSection";
import ContributeForm, { type Prefill } from "@/components/ContributeForm";
import PendingPanel from "@/components/PendingPanel";

export default function HomeClient() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const { pendientes, encolar, sincronizar, sincronizando } = useOfflineQueue((o) =>
    setObservations((prev) => [o, ...prev]),
  );

  useEffect(() => {
    fetchObservations().then(setObservations).catch(() => setObservations([]));
  }, []);

  return (
    <>
      <IdentifySection onPrefill={setPrefill} />
      <MapSection observations={observations} />
      <CompararSection />
      <PrediccionSection />
      <ContributeForm prefill={prefill} onQueue={encolar} />
      <PendingPanel pendientes={pendientes} sincronizar={sincronizar} sincronizando={sincronizando} />
    </>
  );
}
```

- [ ] **Step 7: Estilos del panel**

In `src/app/globals.css`, append:

```css
.pending-panel { margin-top: 1rem; }
.pending-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.pending-list { list-style: none; padding: 0; margin: 0.75rem 0 0; display: grid; gap: 0.4rem; }
.pending-list li { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.9rem; }
.pending-state { color: #6b7280; }
.pending-state--error { color: #b91c1c; }
.pending-state--subiendo { color: #2563eb; }
```

- [ ] **Step 8: Verificar tipos y suite completa**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores de tipos; todas las suites PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/offline/useOfflineQueue.ts src/components/PendingPanel.tsx src/components/HomeClient.tsx src/app/globals.css src/lib/offline/__tests__/useOfflineQueue.test.tsx
git commit -m "feat: panel de pendientes y sincronización automática al recuperar señal"
```

---

## Task 7: PWA instalable y guía de preparación offline

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `src/app/sw.ts`
- Create: `src/components/PrepOffline.tsx`
- Modify: `next.config.mjs`
- Modify: `src/app/layout.tsx` (enlazar manifest)
- Modify: `src/components/ContributeForm.tsx` (montar `<PrepOffline />` al inicio del formulario)

> Esta task es configuración + UI; la verificación es manual (build + DevTools), no TDD.

- [ ] **Step 1: Instalar Serwist**

```bash
npm install @serwist/next serwist
```

- [ ] **Step 2: Crear el service worker**

Create `src/app/sw.ts`:

```ts
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (string | { url: string; revision: string | null })[] };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

- [ ] **Step 3: Envolver la config de Next**

Replace the contents of `next.config.mjs` with:

```js
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSerwist(nextConfig);
```

- [ ] **Step 4: Crear el manifiesto**

Create `public/manifest.webmanifest`:

```json
{
  "name": "Quintral Insight",
  "short_name": "Quintral",
  "description": "Registro y monitoreo de quintrales, incluso sin señal.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f1f14",
  "theme_color": "#0f1f14",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

> Si no existen `public/icon-192.png` / `public/icon-512.png`, generarlos a partir del logo o usar un PNG sólido del color de marca. Verificar que los dos archivos existan en `public/` antes del build.

- [ ] **Step 5: Enlazar el manifiesto en el layout**

In `src/app/layout.tsx`, add to the exported `metadata` object (or create it if absent):

```ts
export const metadata = {
  // ...lo existente...
  manifest: "/manifest.webmanifest",
};
```

If a `viewport` export is not present, add:

```ts
export const viewport = { themeColor: "#0f1f14" };
```

- [ ] **Step 6: Crear la guía de preparación**

Create `src/components/PrepOffline.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";

interface PromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function PrepOffline() {
  const [instalable, setInstalable] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstalable(e as PromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <div className="prep-offline card card-pad">
      <strong>¿Vas a un cerro sin señal?</strong>
      <ol className="prep-list">
        <li>Instala la app en tu teléfono.</li>
        <li>Ábrela una vez <em>con señal</em> para que quede lista.</li>
        <li>Activa el permiso de ubicación (el GPS funciona sin datos).</li>
      </ol>
      {instalable && (
        <button
          type="button"
          className="btn btn--primary"
          onClick={async () => {
            await instalable.prompt();
            setInstalable(null);
          }}
        >
          Instalar app
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Montar la guía en el formulario**

In `src/components/ContributeForm.tsx`, add the import:

```tsx
import PrepOffline from "@/components/PrepOffline";
```

Then render `<PrepOffline />` as the first child inside `<form className="card card-pad contribute-form" ...>` (right after the opening `<form>` tag, before the "foto adjunta" block).

- [ ] **Step 8: Estilos de la guía**

In `src/app/globals.css`, append:

```css
.prep-offline { margin-bottom: 1rem; }
.prep-list { margin: 0.5rem 0 0.75rem; padding-left: 1.1rem; display: grid; gap: 0.25rem; font-size: 0.9rem; }
```

- [ ] **Step 9: Verificar build y tipos**

Run: `npx tsc --noEmit && npm run build`
Expected: build OK; se genera `public/sw.js`.

- [ ] **Step 10: Verificación manual offline**

1. `npm run build && npm start`.
2. Abrir en el navegador, DevTools → Application → Service Workers: confirmar que `sw.js` está activo.
3. DevTools → Network → marcar **Offline**. Recargar: la app debe seguir cargando.
4. Aún offline: completar el formulario, "Usar mi ubicación" (en escritorio puede no dar altitud; probar en teléfono real para GPS/altitud), "Enviar" → ver el mensaje de guardado y el panel "Pendientes de subir: 1".
5. Quitar **Offline**: el panel debe vaciarse solo y la observación aparecer en el mapa.

- [ ] **Step 11: Commit**

```bash
git add next.config.mjs src/app/sw.ts public/manifest.webmanifest src/app/layout.tsx src/components/PrepOffline.tsx src/components/ContributeForm.tsx src/app/globals.css public/icon-192.png public/icon-512.png
git commit -m "feat: PWA instalable y guía de preparación para uso sin señal"
```

---

## Self-Review (cobertura del spec)

- App abre offline → Task 7 (Serwist PWA). ✓
- Captura coordenadas + altitud GPS offline → Task 5. ✓
- Foto + datos guardados localmente → Task 1 (cola) + Task 5 (encolar) + Task 6 (wiring). ✓
- Subida automática al volver la señal → Task 3 (sync) + Task 6 (evento `online`/carga). ✓
- Altitud corregida con servicio de elevación + respaldo GPS → Task 2 + Task 3. ✓
- Manejo de errores (un fallo no bota la cola, respaldo de altitud, permiso/GPS) → Task 3 + Task 5. ✓
- UX: indicador de conexión → Task 4; mensajes offline → Task 5; panel de pendientes + sincronizar → Task 6; preparación + instalar → Task 7. ✓
- Pruebas Vitest de db, elevación, sync, hooks y formulario → Tasks 1–6. ✓
- Fuera de alcance (Background Sync, IA en terreno, columnas Supabase) → respetado. ✓
