# Panel de Administración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una página `/admin` protegida con contraseña que permita borrar, ocultar, editar y verificar observaciones ciudadanas, con historial de acciones y badge "verificado" en el mapa público.

**Architecture:** Cookie httpOnly generada con SHA-256 de la contraseña de entorno protege todas las rutas `/api/admin/*`. Las operaciones destructivas usan `getSupabaseAdmin()` (service role key, ya existente en `src/lib/server/supabaseAdmin.ts`). El mapa público filtra `oculta=false`; las observaciones verificadas muestran un badge en el popup de Leaflet.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (supabase-js), Vitest + @testing-library/react, Web Crypto API (nativa, sin dependencias extra).

## Global Constraints

- Nunca usar prefijo `NEXT_PUBLIC_` en `ADMIN_PASSWORD` ni `SUPABASE_SERVICE_ROLE_KEY`.
- Todas las rutas `/api/admin/*` deben retornar `401` si la cookie no es válida, antes de cualquier operación de base de datos.
- `getSupabaseAdmin()` ya existe en `src/lib/server/supabaseAdmin.ts` — no crear otro cliente admin.
- Tests con Vitest; mocks con `vi.mock`. Ejecutar tests con `npm test`.
- Commits frecuentes después de cada tarea.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `supabase/migrations/0002_admin.sql` | Crear | Columnas nuevas + tabla admin_log |
| `src/lib/types.ts` | Modificar | Agregar campos admin a `Observation` |
| `src/lib/observations.ts` | Modificar | Actualizar `ObservacionRow`, `mapRowToObservation`, filtro `oculta=false` en `fetchObservations` |
| `src/lib/__tests__/observations.test.ts` | Modificar | Actualizar fixtures con campos nuevos |
| `src/components/MapaQuintral.tsx` | Modificar | Badge verificado en popup, weight mayor en verificadas |
| `src/lib/server/adminAuth.ts` | Crear | `hashPassword`, `isValidSession` |
| `src/lib/server/__tests__/adminAuth.test.ts` | Crear | Tests de hashing y verificación |
| `src/app/api/admin/login/route.ts` | Crear | POST login → emite cookie |
| `src/app/api/admin/logout/route.ts` | Crear | POST logout → elimina cookie |
| `src/app/api/admin/login/__tests__/route.test.ts` | Crear | Tests de login/logout |
| `src/app/api/admin/observaciones/route.ts` | Crear | GET todas las observaciones (incluye ocultas) |
| `src/app/api/admin/observaciones/[id]/route.ts` | Crear | PATCH (toggle/editar) + DELETE |
| `src/app/api/admin/log/route.ts` | Crear | GET historial admin_log |
| `src/app/api/admin/observaciones/__tests__/route.test.ts` | Crear | Tests de rutas CRUD admin |
| `src/app/admin/page.tsx` | Crear | Server Component: lee cookie → LoginForm o AdminPanel |
| `src/app/admin/LoginForm.tsx` | Crear | Client Component: formulario contraseña |
| `src/app/admin/AdminPanel.tsx` | Crear | Client Component: tabla + filtros + historial |
| `.env.local.example` | Modificar | Documentar `ADMIN_PASSWORD` y `SUPABASE_SERVICE_ROLE_KEY` |

---

### Task 1: Migración SQL

**Files:**
- Create: `supabase/migrations/0002_admin.sql`
- Modify: `.env.local.example`

**Interfaces:**
- Produces: tabla `observaciones` con columnas `oculta`, `verificada`, `editado_en`, `notas_admin`; tabla `admin_log`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/0002_admin.sql

-- Columnas admin en observaciones
alter table observaciones
  add column if not exists oculta      boolean      not null default false,
  add column if not exists verificada  boolean      not null default false,
  add column if not exists editado_en  timestamptz,
  add column if not exists notas_admin text;

-- Tabla de historial de acciones admin
create table if not exists admin_log (
  id             uuid        primary key default gen_random_uuid(),
  observacion_id uuid        references observaciones(id) on delete set null,
  accion         text        not null,
  detalle        jsonb,
  fecha          timestamptz not null default now()
);

-- Sin políticas públicas en admin_log: solo service role key puede leer/escribir
alter table admin_log enable row level security;
```

- [ ] **Step 2: Actualizar .env.local.example**

Reemplazar el contenido actual de `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
ADMIN_PASSWORD=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: Aplicar migración en Supabase**

Ejecutar el SQL en el panel de Supabase → SQL Editor, o con CLI:

```bash
npx supabase db push
```

Verificar en el panel → Table Editor que `observaciones` tiene las 4 columnas nuevas y que `admin_log` existe.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_admin.sql .env.local.example
git commit -m "feat: migración admin — columnas oculta/verificada y tabla admin_log"
```

---

### Task 2: Tipos y mapper

**Files:**
- Modify: `src/lib/types.ts:34-47`
- Modify: `src/lib/observations.ts`
- Modify: `src/lib/__tests__/observations.test.ts`

**Interfaces:**
- Produces: `Observation` con campos `oculta: boolean`, `verificada: boolean`, `notasAdmin: string | null`, `editadoEn: string | null`
- Produces: `fetchObservations()` filtra `oculta = false`

- [ ] **Step 1: Escribir tests que fallan**

Reemplazar el contenido de `src/lib/__tests__/observations.test.ts`:

```ts
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
    const o = mapRowToObservation(baseRow({ oculta: true, verificada: true, notas_admin: "ok", editado_en: "2026-06-25T00:00:00Z" }));
    expect(o.oculta).toBe(true);
    expect(o.verificada).toBe(true);
    expect(o.notasAdmin).toBe("ok");
    expect(o.editadoEn).toBe("2026-06-25T00:00:00Z");
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npm test -- observations.test.ts
```

Esperado: FAIL — `mapRowToObservation(row)` no incluye `oculta`, `verificada`, etc.

- [ ] **Step 3: Actualizar `src/lib/types.ts`**

Reemplazar la interfaz `Observation`:

```ts
export interface Observation {
  id: string;
  nombreObservador: string;
  lat: number;
  lng: number;
  hospedero: Host;
  hospederoOtro: string | null;
  fenologia: string;
  altitud: number | null;
  exposicionSolar: string | null;
  fotoUrl: string | null;
  cerro: string | null;
  creadoEn: string;
  oculta: boolean;
  verificada: boolean;
  notasAdmin: string | null;
  editadoEn: string | null;
}
```

- [ ] **Step 4: Actualizar `src/lib/observations.ts`**

Reemplazar el contenido completo del archivo:

```ts
import type { Host, Observation } from "@/lib/types";
import { HOSPEDEROS } from "@/lib/hosts";
import { getSupabase } from "@/lib/supabase";

export interface ObservacionRow {
  id: string;
  nombre_observador: string;
  lat: number;
  lng: number;
  hospedero: string;
  hospedero_otro: string | null;
  fenologia: string;
  altitud: number | null;
  exposicion_solar: string | null;
  foto_url: string | null;
  resultado_ia: unknown;
  cerro: string | null;
  creado_en: string;
  oculta: boolean;
  verificada: boolean;
  notas_admin: string | null;
  editado_en: string | null;
}

export interface NewObservation {
  nombreObservador: string;
  lat: number;
  lng: number;
  hospedero: Host;
  hospederoOtro: string | null;
  fenologia: string;
  altitud: number | null;
  exposicionSolar: string | null;
  fotoUrl: string | null;
  resultadoIa: unknown;
  cerro: string | null;
}

export function mapRowToObservation(row: ObservacionRow): Observation {
  const hospedero = HOSPEDEROS.includes(row.hospedero as Host)
    ? (row.hospedero as Host)
    : "otro";
  return {
    id: row.id,
    nombreObservador: row.nombre_observador,
    lat: row.lat,
    lng: row.lng,
    hospedero,
    hospederoOtro: row.hospedero_otro,
    fenologia: row.fenologia,
    altitud: row.altitud,
    exposicionSolar: row.exposicion_solar,
    fotoUrl: row.foto_url,
    cerro: row.cerro,
    creadoEn: row.creado_en,
    oculta: row.oculta,
    verificada: row.verificada,
    notasAdmin: row.notas_admin,
    editadoEn: row.editado_en,
  };
}

export async function fetchObservations(): Promise<Observation[]> {
  const { data, error } = await getSupabase()
    .from("observaciones")
    .select("*")
    .eq("oculta", false)
    .order("creado_en", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ObservacionRow[]).map(mapRowToObservation);
}

export async function createObservation(input: NewObservation): Promise<Observation> {
  const { data, error } = await getSupabase()
    .from("observaciones")
    .insert({
      nombre_observador: input.nombreObservador,
      lat: input.lat,
      lng: input.lng,
      hospedero: input.hospedero,
      hospedero_otro: input.hospederoOtro,
      fenologia: input.fenologia,
      altitud: input.altitud,
      exposicion_solar: input.exposicionSolar,
      foto_url: input.fotoUrl,
      resultado_ia: input.resultadoIa,
      cerro: input.cerro,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No se recibió dato al crear la observación");
  return mapRowToObservation(data as ObservacionRow);
}
```

- [ ] **Step 5: Verificar que tests pasan**

```bash
npm test -- observations.test.ts
```

Esperado: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/observations.ts src/lib/__tests__/observations.test.ts
git commit -m "feat: agregar campos admin a Observation y filtro oculta en fetchObservations"
```

---

### Task 3: Badge verificado en mapa público

**Files:**
- Modify: `src/components/MapaQuintral.tsx`

**Interfaces:**
- Consumes: `Observation.verificada: boolean` (de Task 2)

- [ ] **Step 1: Escribir test que falla**

Crear `src/components/__tests__/MapaQuintralVerificado.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MapaQuintral from "@/components/MapaQuintral";
import type { Observation } from "@/lib/types";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));

function obs(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "1", nombreObservador: "Ana", lat: -33.21, lng: -70.34,
    hospedero: "quillay", hospederoOtro: null, fenologia: "en flor",
    altitud: null, exposicionSolar: null, fotoUrl: null, cerro: null,
    creadoEn: "2026-06-24T00:00:00Z", oculta: false, verificada: false,
    notasAdmin: null, editadoEn: null,
    ...overrides,
  };
}

describe("MapaQuintral verificado", () => {
  it("muestra badge '✓ Verificado' cuando verificada=true", () => {
    render(<MapaQuintral observations={[obs({ verificada: true })]} />);
    expect(screen.getByText(/Verificado/)).toBeTruthy();
  });

  it("no muestra badge cuando verificada=false", () => {
    render(<MapaQuintral observations={[obs({ verificada: false })]} />);
    expect(screen.queryByText(/Verificado/)).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npm test -- MapaQuintralVerificado
```

Esperado: FAIL — no hay texto "Verificado" en el render.

- [ ] **Step 3: Actualizar MapaQuintral.tsx**

Reemplazar el contenido completo:

```tsx
"use client";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { colorHospedero, etiquetaHospedero } from "@/lib/hosts";
import { isSafePhotoUrl } from "@/lib/photoUrl";
import type { Observation } from "@/lib/types";

const CENTRO_DEFAULT: [number, number] = [-33.2123, -70.342];

export default function MapaQuintral({ observations }: { observations: Observation[] }) {
  return (
    <MapContainer center={CENTRO_DEFAULT} zoom={14} style={{ height: 480, width: "100%" }}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      {observations.map((observation) => {
        const fotoSegura = isSafePhotoUrl(observation.fotoUrl) ? observation.fotoUrl : null;

        return (
          <CircleMarker
            key={observation.id}
            center={[observation.lat, observation.lng]}
            radius={8}
            pathOptions={{
              color: colorHospedero(observation.hospedero),
              fillOpacity: 0.8,
              weight: observation.verificada ? 3 : 1,
            }}
          >
            <Popup>
              <strong>{etiquetaHospedero(observation.hospedero)}</strong>
              <br />
              {observation.fenologia || "sin fenologia"}
              <br />
              {observation.cerro ?? "sin cerro"} · {observation.nombreObservador}
              {observation.verificada && (
                <>
                  <br />
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>✓ Verificado</span>
                </>
              )}
              {fotoSegura ? (
                <>
                  <br />
                  <img src={fotoSegura} alt="ejemplar" style={{ width: 160, marginTop: 4 }} />
                </>
              ) : null}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
```

- [ ] **Step 4: Verificar que tests pasan**

```bash
npm test -- MapaQuintralVerificado
```

Esperado: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MapaQuintral.tsx src/components/__tests__/MapaQuintralVerificado.test.tsx
git commit -m "feat: badge verificado en mapa público y borde más grueso en marcadores verificados"
```

---

### Task 4: adminAuth helper

**Files:**
- Create: `src/lib/server/adminAuth.ts`
- Create: `src/lib/server/__tests__/adminAuth.test.ts`

**Interfaces:**
- Produces: `hashPassword(pw: string): Promise<string>` — SHA-256 hexadecimal
- Produces: `isValidSession(cookieValue: string | undefined): Promise<boolean>` — compara contra `process.env.ADMIN_PASSWORD`

- [ ] **Step 1: Escribir tests que fallan**

Crear `src/lib/server/__tests__/adminAuth.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, isValidSession } from "@/lib/server/adminAuth";

describe("hashPassword", () => {
  it("devuelve string hexadecimal de 64 caracteres", async () => {
    const hash = await hashPassword("mi-clave");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("es determinista para la misma entrada", async () => {
    expect(await hashPassword("abc")).toBe(await hashPassword("abc"));
  });

  it("produce hashes distintos para entradas distintas", async () => {
    expect(await hashPassword("a")).not.toBe(await hashPassword("b"));
  });
});

describe("isValidSession", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "secret123";
  });

  it("acepta el hash correcto de la contraseña de entorno", async () => {
    const hash = await hashPassword("secret123");
    expect(await isValidSession(hash)).toBe(true);
  });

  it("rechaza undefined", async () => {
    expect(await isValidSession(undefined)).toBe(false);
  });

  it("rechaza un hash incorrecto", async () => {
    expect(await isValidSession("0000000000000000000000000000000000000000000000000000000000000000")).toBe(false);
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npm test -- adminAuth.test.ts
```

Esperado: FAIL — `@/lib/server/adminAuth` no existe.

- [ ] **Step 3: Crear `src/lib/server/adminAuth.ts`**

```ts
export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await hashPassword(process.env.ADMIN_PASSWORD ?? "");
  return cookieValue === expected;
}
```

- [ ] **Step 4: Verificar que tests pasan**

```bash
npm test -- adminAuth.test.ts
```

Esperado: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/adminAuth.ts src/lib/server/__tests__/adminAuth.test.ts
git commit -m "feat: helper adminAuth con hashPassword e isValidSession"
```

---

### Task 5: API admin login y logout

**Files:**
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`
- Create: `src/app/api/admin/login/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `hashPassword` de `@/lib/server/adminAuth`
- Produces: `POST /api/admin/login` → 200 + cookie `admin_session` | 401
- Produces: `POST /api/admin/logout` → 200 + borra cookie

- [ ] **Step 1: Escribir tests que fallan**

Crear `src/app/api/admin/login/__tests__/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/adminAuth", () => ({
  hashPassword: vi.fn().mockResolvedValue("FAKEHASH64AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),
  isValidSession: vi.fn(),
}));

import { POST as postLogin } from "@/app/api/admin/login/route";
import { POST as postLogout } from "@/app/api/admin/logout/route";

function loginReq(password: string): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "secret123";
    vi.clearAllMocks();
  });

  it("devuelve 200 y establece cookie cuando la contraseña es correcta", async () => {
    const res = await postLogin(loginReq("secret123"));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("admin_session");
  });

  it("devuelve 401 cuando la contraseña es incorrecta", async () => {
    const res = await postLogin(loginReq("wrong"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/logout", () => {
  it("devuelve 200", async () => {
    const res = await postLogout();
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npm test -- "login/__tests__/route.test.ts"
```

Esperado: FAIL — archivos no existen.

- [ ] **Step 3: Crear `src/app/api/admin/login/route.ts`**

```ts
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/server/adminAuth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const { password } = await request.json() as { password?: string };
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  const hash = await hashPassword(password);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", hash, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
```

- [ ] **Step 4: Crear `src/app/api/admin/logout/route.ts`**

```ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("admin_session");
  return response;
}
```

- [ ] **Step 5: Verificar que tests pasan**

```bash
npm test -- "login/__tests__/route.test.ts"
```

Esperado: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/login/ src/app/api/admin/logout/
git commit -m "feat: rutas POST /api/admin/login y /api/admin/logout"
```

---

### Task 6: API admin observaciones (GET, PATCH, DELETE) y log

**Files:**
- Create: `src/app/api/admin/observaciones/route.ts`
- Create: `src/app/api/admin/observaciones/[id]/route.ts`
- Create: `src/app/api/admin/log/route.ts`
- Create: `src/app/api/admin/observaciones/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `isValidSession` de `@/lib/server/adminAuth`; `getSupabaseAdmin` de `@/lib/server/supabaseAdmin`; `mapRowToObservation`, `ObservacionRow` de `@/lib/observations`
- Produces: `GET /api/admin/observaciones` → `Observation[]` (todas, incluye ocultas)
- Produces: `PATCH /api/admin/observaciones/[id]` body `{ action: "toggle_oculta" | "toggle_verificada" | "edit", fields?: Record<string,unknown> }` → `{ ok: true, ...toggledField? }`
- Produces: `DELETE /api/admin/observaciones/[id]` → `{ ok: true }`
- Produces: `GET /api/admin/log` → `AdminLogEntry[]`

- [ ] **Step 1: Escribir tests que fallan**

Crear `src/app/api/admin/observaciones/__tests__/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookies = vi.fn();
vi.mock("next/headers", () => ({ cookies: mockCookies }));

vi.mock("@/lib/server/adminAuth", () => ({
  isValidSession: vi.fn(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/server/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { isValidSession } from "@/lib/server/adminAuth";
import { GET } from "@/app/api/admin/observaciones/route";

function cookieStore(value?: string) {
  return { get: (name: string) => (name === "admin_session" && value ? { value } : undefined) };
}

describe("GET /api/admin/observaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue(cookieStore("HASH"));
    vi.mocked(isValidSession).mockResolvedValue(true);
    mockFrom.mockReturnValue({
      select: () => ({ order: () => ({ data: [], error: null }) }),
    });
  });

  it("devuelve 401 si la sesión no es válida", async () => {
    vi.mocked(isValidSession).mockResolvedValueOnce(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("devuelve array vacío cuando no hay observaciones", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npm test -- "observaciones/__tests__/route.test.ts"
```

Esperado: FAIL — archivo no existe.

- [ ] **Step 3: Crear `src/app/api/admin/observaciones/route.ts`**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/lib/server/adminAuth";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { mapRowToObservation, type ObservacionRow } from "@/lib/observations";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!(await isValidSession(session))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("observaciones")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((r) => mapRowToObservation(r as ObservacionRow)));
}
```

- [ ] **Step 4: Crear `src/app/api/admin/observaciones/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/lib/server/adminAuth";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

async function autenticar(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get("admin_session")?.value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!(await autenticar())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    action: "toggle_oculta" | "toggle_verificada" | "edit";
    fields?: Record<string, unknown>;
  };

  const supabase = getSupabaseAdmin();

  const { data: current, error: fetchErr } = await supabase
    .from("observaciones")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !current) {
    return NextResponse.json({ error: "Observación no encontrada" }, { status: 404 });
  }

  if (body.action === "toggle_oculta") {
    const oculta = !current.oculta;
    const { error } = await supabase.from("observaciones").update({ oculta }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from("admin_log").insert({ observacion_id: id, accion: oculta ? "ocultada" : "mostrada", detalle: null });
    return NextResponse.json({ ok: true, oculta });
  }

  if (body.action === "toggle_verificada") {
    const verificada = !current.verificada;
    const { error } = await supabase.from("observaciones").update({ verificada }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from("admin_log").insert({ observacion_id: id, accion: verificada ? "verificada" : "desverificada", detalle: null });
    return NextResponse.json({ ok: true, verificada });
  }

  if (body.action === "edit" && body.fields) {
    const snapshot = {
      hospedero: current.hospedero, fenologia: current.fenologia,
      cerro: current.cerro, altitud: current.altitud,
      exposicion_solar: current.exposicion_solar, notas_admin: current.notas_admin,
    };
    const { error } = await supabase.from("observaciones")
      .update({ ...body.fields, editado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from("admin_log").insert({ observacion_id: id, accion: "editada", detalle: snapshot });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!(await autenticar())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: current } = await supabase.from("observaciones").select("*").eq("id", id).single();
  if (!current) return NextResponse.json({ error: "Observación no encontrada" }, { status: 404 });

  await supabase.from("admin_log").insert({ observacion_id: id, accion: "borrada", detalle: current });

  const { error } = await supabase.from("observaciones").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Crear `src/app/api/admin/log/route.ts`**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/lib/server/adminAuth";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!(await isValidSession(session))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("admin_log")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
```

- [ ] **Step 6: Verificar que tests pasan**

```bash
npm test -- "observaciones/__tests__/route.test.ts"
```

Esperado: 2 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/admin/
git commit -m "feat: rutas API admin para listar, editar, ocultar, verificar y borrar observaciones"
```

---

### Task 7: Página /admin — login gate

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/LoginForm.tsx`

**Interfaces:**
- Consumes: `isValidSession` de `@/lib/server/adminAuth`; `cookies` de `next/headers`
- Produces: `GET /admin` → renderiza `<LoginForm />` si no hay sesión, `<AdminPanel />` si la hay

- [ ] **Step 1: Crear `src/app/admin/LoginForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError("Contraseña incorrecta.");
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)" }}>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12, width: 280, padding: 32, background: "var(--card)", borderRadius: 12 }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Quintral Admin</h1>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", fontSize: "1rem" }}
        />
        {error && <p style={{ color: "var(--error, red)", margin: 0, fontSize: "0.875rem" }}>{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Crear `src/app/admin/page.tsx`**

```tsx
import { cookies } from "next/headers";
import { isValidSession } from "@/lib/server/adminAuth";
import LoginForm from "@/app/admin/LoginForm";
import AdminPanel from "@/app/admin/AdminPanel";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  const autenticado = await isValidSession(session);

  if (!autenticado) return <LoginForm />;
  return <AdminPanel />;
}
```

- [ ] **Step 3: Verificar manualmente**

```bash
npm run dev
```

Abrir `http://localhost:3000/admin`. Debe aparecer el formulario de contraseña. Sin necesidad de test automatizado para esta ruta de server component.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/LoginForm.tsx
git commit -m "feat: página /admin con login gate por cookie httpOnly"
```

---

### Task 8: AdminPanel — tabla, filtros, acciones e historial

**Files:**
- Create: `src/app/admin/AdminPanel.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/observaciones` → `Observation[]`; `GET /api/admin/log` → `AdminLogEntry[]`; `PATCH /api/admin/observaciones/[id]`; `DELETE /api/admin/observaciones/[id]`; `POST /api/admin/logout`
- Consumes: `Observation` con campos `oculta`, `verificada`, `notasAdmin`, `editadoEn` (de Task 2)

- [ ] **Step 1: Crear `src/app/admin/AdminPanel.tsx`**

```tsx
"use client";
import { Fragment, useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import { etiquetaHospedero } from "@/lib/hosts";

type AdminLogEntry = {
  id: string;
  observacion_id: string | null;
  accion: string;
  detalle: unknown;
  fecha: string;
};

type Filter = "todas" | "ocultas" | "verificadas";

type EditForm = {
  hospedero: string;
  fenologia: string;
  cerro: string;
  altitud: string;
  exposicionSolar: string;
  notasAdmin: string;
};

function emptyEdit(o: Observation): EditForm {
  return {
    hospedero: o.hospedero,
    fenologia: o.fenologia,
    cerro: o.cerro ?? "",
    altitud: o.altitud != null ? String(o.altitud) : "",
    exposicionSolar: o.exposicionSolar ?? "",
    notasAdmin: o.notasAdmin ?? "",
  };
}

export default function AdminPanel() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [log, setLog] = useState<AdminLogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("todas");
  const [hospederoFiltro, setHospederoFiltro] = useState("todos");
  const [cerroFiltro, setCerroFiltro] = useState("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/observaciones").then((r) => r.json()).then(setObservations);
    fetch("/api/admin/log").then((r) => r.json()).then(setLog);
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  async function toggleOculta(id: string) {
    const res = await fetch(`/api/admin/observaciones/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "toggle_oculta" }),
    });
    if (!res.ok) return;
    const { oculta } = await res.json() as { oculta: boolean };
    setObservations((prev) => prev.map((o) => o.id === id ? { ...o, oculta } : o));
    appendLog(id, oculta ? "ocultada" : "mostrada");
  }

  async function toggleVerificada(id: string) {
    const res = await fetch(`/api/admin/observaciones/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "toggle_verificada" }),
    });
    if (!res.ok) return;
    const { verificada } = await res.json() as { verificada: boolean };
    setObservations((prev) => prev.map((o) => o.id === id ? { ...o, verificada } : o));
    appendLog(id, verificada ? "verificada" : "desverificada");
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    const res = await fetch(`/api/admin/observaciones/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "edit",
        fields: {
          hospedero: editForm.hospedero,
          fenologia: editForm.fenologia,
          cerro: editForm.cerro || null,
          altitud: editForm.altitud ? Number(editForm.altitud) : null,
          exposicion_solar: editForm.exposicionSolar || null,
          notas_admin: editForm.notasAdmin || null,
        },
      }),
    });
    if (!res.ok) return;
    setObservations((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              hospedero: editForm.hospedero as Observation["hospedero"],
              fenologia: editForm.fenologia,
              cerro: editForm.cerro || null,
              altitud: editForm.altitud ? Number(editForm.altitud) : null,
              exposicionSolar: editForm.exposicionSolar || null,
              notasAdmin: editForm.notasAdmin || null,
              editadoEn: new Date().toISOString(),
            }
          : o,
      ),
    );
    setEditingId(null);
    setEditForm(null);
    appendLog(id, "editada");
  }

  async function borrar(id: string) {
    const res = await fetch(`/api/admin/observaciones/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setObservations((prev) => prev.filter((o) => o.id !== id));
    setConfirmDeleteId(null);
    appendLog(null, "borrada");
  }

  function appendLog(observacion_id: string | null, accion: string) {
    setLog((prev) => [
      { id: crypto.randomUUID(), observacion_id, accion, detalle: null, fecha: new Date().toISOString() },
      ...prev,
    ]);
  }

  const hospederos = Array.from(new Set(observations.map((o) => o.hospedero)));
  const cerros = Array.from(new Set(observations.map((o) => o.cerro).filter(Boolean))) as string[];

  const visibles = observations.filter((o) => {
    if (filter === "ocultas" && !o.oculta) return false;
    if (filter === "verificadas" && !o.verificada) return false;
    if (hospederoFiltro !== "todos" && o.hospedero !== hospederoFiltro) return false;
    if (cerroFiltro !== "todos" && o.cerro !== cerroFiltro) return false;
    return true;
  });

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Quintral Admin</h1>
        <button onClick={logout} className="btn btn--ghost">Cerrar sesión</button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
        {(["todas", "ocultas", "verificadas"] as Filter[]).map((f) => (
          <button
            key={f}
            className="pill"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            style={{ textTransform: "capitalize" }}
          >
            {f}
          </button>
        ))}
        <select value={hospederoFiltro} onChange={(e) => setHospederoFiltro(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6 }}>
          <option value="todos">Hospedero: todos</option>
          {hospederos.map((h) => <option key={h} value={h}>{etiquetaHospedero(h)}</option>)}
        </select>
        <select value={cerroFiltro} onChange={(e) => setCerroFiltro(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6 }}>
          <option value="todos">Cerro: todos</option>
          {cerros.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <p style={{ color: "#666", marginBottom: "0.5rem" }}>{visibles.length} de {observations.length} registros</p>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={th}>Fecha</th>
              <th style={th}>Observador</th>
              <th style={th}>Hospedero</th>
              <th style={th}>Cerro</th>
              <th style={th}>Fenología</th>
              <th style={th}>Estado</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((o) => (
              <Fragment key={o.id}>
                <tr style={{ borderBottom: "1px solid #eee", opacity: o.oculta ? 0.5 : 1 }}>
                  <td style={td}>{new Date(o.creadoEn).toLocaleDateString("es-CL")}</td>
                  <td style={td}>{o.nombreObservador}</td>
                  <td style={td}>{etiquetaHospedero(o.hospedero)}</td>
                  <td style={td}>{o.cerro ?? "—"}</td>
                  <td style={td}>{o.fenologia}</td>
                  <td style={td}>
                    <span style={{ color: o.verificada ? "#22c55e" : o.oculta ? "#999" : "#f59e0b", fontWeight: 600 }}>
                      {o.verificada ? "✓ verificada" : o.oculta ? "oculta" : "pendiente"}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        title="Editar"
                        className="btn btn--ghost"
                        style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                        onClick={() => { setEditingId(o.id); setEditForm(emptyEdit(o)); }}
                      >
                        ✏️
                      </button>
                      <button
                        title={o.oculta ? "Mostrar" : "Ocultar"}
                        className="btn btn--ghost"
                        style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                        onClick={() => toggleOculta(o.id)}
                      >
                        {o.oculta ? "👁" : "🚫"}
                      </button>
                      <button
                        title={o.verificada ? "Desverificar" : "Verificar"}
                        className="btn btn--ghost"
                        style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                        onClick={() => toggleVerificada(o.id)}
                      >
                        {o.verificada ? "✓" : "○"}
                      </button>
                      <button
                        title="Borrar"
                        className="btn btn--ghost"
                        style={{ padding: "2px 8px", fontSize: "0.75rem", color: "#ef4444" }}
                        onClick={() => setConfirmDeleteId(o.id)}
                      >
                        🗑
                      </button>
                    </div>
                    {confirmDeleteId === o.id && (
                      <div style={{ marginTop: 4, fontSize: "0.75rem" }}>
                        <span>¿Eliminar? </span>
                        <button onClick={() => borrar(o.id)} style={{ color: "#ef4444", marginRight: 4 }}>Sí</button>
                        <button onClick={() => setConfirmDeleteId(null)}>No</button>
                      </div>
                    )}
                  </td>
                </tr>
                {editingId === o.id && editForm && (
                  <tr>
                    <td colSpan={7} style={{ padding: "12px 8px", background: "#fafafa" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <label style={labelStyle}>
                          Hospedero
                          <input value={editForm.hospedero} onChange={(e) => setEditForm((f) => f && { ...f, hospedero: e.target.value })} style={inputStyle} />
                        </label>
                        <label style={labelStyle}>
                          Fenología
                          <input value={editForm.fenologia} onChange={(e) => setEditForm((f) => f && { ...f, fenologia: e.target.value })} style={inputStyle} />
                        </label>
                        <label style={labelStyle}>
                          Cerro
                          <input value={editForm.cerro} onChange={(e) => setEditForm((f) => f && { ...f, cerro: e.target.value })} style={inputStyle} />
                        </label>
                        <label style={labelStyle}>
                          Altitud
                          <input value={editForm.altitud} onChange={(e) => setEditForm((f) => f && { ...f, altitud: e.target.value })} style={inputStyle} />
                        </label>
                        <label style={labelStyle}>
                          Exposición
                          <input value={editForm.exposicionSolar} onChange={(e) => setEditForm((f) => f && { ...f, exposicionSolar: e.target.value })} style={inputStyle} />
                        </label>
                        <label style={labelStyle}>
                          Notas admin
                          <input value={editForm.notasAdmin} onChange={(e) => setEditForm((f) => f && { ...f, notasAdmin: e.target.value })} style={inputStyle} />
                        </label>
                        <button className="btn btn--primary" style={{ padding: "4px 12px", fontSize: "0.875rem" }} onClick={() => saveEdit(o.id)}>Guardar</button>
                        <button className="btn btn--ghost" style={{ padding: "4px 12px", fontSize: "0.875rem" }} onClick={() => { setEditingId(null); setEditForm(null); }}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historial */}
      <h2 style={{ marginTop: "2rem" }}>Historial de acciones</h2>
      <ul style={{ listStyle: "none", padding: 0, fontSize: "0.875rem", color: "#555" }}>
        {log.map((entry) => (
          <li key={entry.id} style={{ padding: "4px 0", borderBottom: "1px solid #eee" }}>
            <span style={{ color: "#999", marginRight: 8 }}>
              {new Date(entry.fecha).toLocaleString("es-CL")}
            </span>
            {entry.observacion_id ? `Obs. ${entry.observacion_id.slice(0, 8)}… ` : "Obs. eliminada — "}
            <strong>{entry.accion}</strong>
          </li>
        ))}
        {log.length === 0 && <li style={{ color: "#999" }}>Sin acciones registradas.</li>}
      </ul>
    </main>
  );
}

const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 12px", verticalAlign: "top" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 2, fontSize: "0.75rem", fontWeight: 600 };
const inputStyle: React.CSSProperties = { padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc", fontSize: "0.875rem", width: 140 };
```

- [ ] **Step 2: Verificar build sin errores de TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Verificar manualmente en dev**

```bash
npm run dev
```

1. Ir a `http://localhost:3000/admin`.
2. Ingresar la contraseña definida en `.env.local` como `ADMIN_PASSWORD`.
3. Verificar que aparece la tabla de observaciones.
4. Probar ocultar, verificar, editar y borrar una observación.
5. Verificar que el historial se actualiza después de cada acción.
6. Ir al mapa en `http://localhost:3000` y comprobar que las observaciones ocultas no aparecen y las verificadas muestran el badge.

- [ ] **Step 4: Commit final**

```bash
git add src/app/admin/
git commit -m "feat: AdminPanel con tabla, filtros, acciones inline e historial de acciones"
```

---

## Resumen de variables de entorno requeridas

Agregar a `.env.local` (no commitear este archivo):

```
NEXT_PUBLIC_SUPABASE_URL=<url de tu proyecto Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key pública>
ANTHROPIC_API_KEY=<tu clave Anthropic>
ADMIN_PASSWORD=<contraseña elegida para el panel admin>
SUPABASE_SERVICE_ROLE_KEY=<service role key de Supabase — solo servidor>
```

La `SUPABASE_SERVICE_ROLE_KEY` se obtiene en Supabase → Project Settings → API → service_role key.
En Vercel, agregar todas estas variables en Settings → Environment Variables.
