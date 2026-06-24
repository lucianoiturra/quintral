# Quintral Insight — Plan de Implementación (Core Loop v1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el core loop de Quintral Insight: subir foto → IA identifica hospedero → se agrega como registro georreferenciado a una base de datos abierta y se ve en un mapa.

**Architecture:** App Next.js (App Router) en una sola página larga con secciones. El frontend lee/escribe registros directamente en Supabase (Postgres + Storage) con la clave anónima. La identificación por foto pasa por una ruta de servidor `/api/identify` que llama a Claude Vision con la clave secreta del lado servidor. Despliegue en Vercel.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Vitest + Testing Library, react-leaflet + Leaflet (OpenStreetMap/OpenTopoMap), Supabase JS, `@anthropic-ai/sdk`.

## Global Constraints

- UI y textos en español (Chile).
- Hospederos válidos (verbatim): `aromo`, `colliguay`, `litre`, `quillay`, `otro`.
- Modelo de IA: `claude-opus-4-8`. La clave `ANTHROPIC_API_KEY` solo se usa en código de servidor (`app/api/**`), nunca en el cliente.
- Aportes totalmente abiertos: los registros se insertan y aparecen en el mapa al instante, sin cuenta ni moderación.
- La IA nunca bloquea el aporte: ante baja confianza o error, el usuario confirma el hospedero a mano.
- Variables de entorno públicas (cliente): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Secretas (servidor): `ANTHROPIC_API_KEY`.
- Coordenadas semilla del Cerro Manquehue (verbatim): `(-33.2129,-70.3416,litre)`, `(-33.2125,-70.3418,litre)`, `(-33.2124,-70.3416,quillay)`, `(-33.2121,-70.3419,quillay)`, `(-33.2117,-70.3426,quillay)`, `(-33.2114,-70.3428,quillay)`.

---

### Task 1: Scaffold del proyecto + tooling de tests

**Files:**
- Create: `package.json`, `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `.env.local.example`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: un proyecto Next.js que arranca con `npm run dev`, y `npm test` corriendo Vitest.

- [ ] **Step 1: Inicializar el proyecto y dependencias**

Run desde la raíz del proyecto:

```bash
npm init -y
npm install next@15 react@19 react-dom@19 @anthropic-ai/sdk @supabase/supabase-js leaflet react-leaflet
npm install -D typescript @types/react @types/node @types/leaflet vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Escribir los archivos de configuración**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

`vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

`.gitignore`:

```
node_modules
.next
.env.local
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 3: Agregar scripts a package.json**

Editar `package.json` para que `"scripts"` sea:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run"
}
```

- [ ] **Step 4: Escribir layout, página y estilos mínimos**

`src/app/globals.css`:

```css
:root { --crema: #f4f1ea; --verde: #1f3d2b; --rojo: #c0392b; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--crema); color: #222; }
```

`src/app/layout.tsx`:

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quintral Insight",
  description: "Identificación y mapa georreferenciado del quintral en la cordillera central.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
export default function Home() {
  return <main>Quintral Insight</main>;
}
```

- [ ] **Step 5: Escribir el test de humo**

`src/lib/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js + Vitest para Quintral Insight"
```

---

### Task 2: Tipos del dominio y hospederos

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/hosts.ts`
- Test: `src/lib/__tests__/hosts.test.ts`

**Interfaces:**
- Produces: `type Host = "aromo" | "colliguay" | "litre" | "quillay" | "otro"`
- Produces: `interface Observation { id: string; nombreObservador: string; lat: number; lng: number; hospedero: Host; hospederoOtro: string | null; fenologia: string; altitud: number | null; exposicionSolar: string | null; fotoUrl: string | null; cerro: string | null; creadoEn: string; }`
- Produces: `interface IdentifyResult { esQuintral: boolean; hospederoProbable: Host; confianza: number; fenologia: string; notas: string; }`
- Produces: `const HOSPEDEROS: Host[]`, `function colorHospedero(h: Host): string`, `function etiquetaHospedero(h: Host): string`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/__tests__/hosts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { HOSPEDEROS, colorHospedero, etiquetaHospedero } from "@/lib/hosts";

describe("hosts", () => {
  it("incluye los cinco hospederos en orden", () => {
    expect(HOSPEDEROS).toEqual(["aromo", "colliguay", "litre", "quillay", "otro"]);
  });

  it("da un color distinto por hospedero conocido", () => {
    const colores = HOSPEDEROS.map(colorHospedero);
    expect(new Set(colores).size).toBe(colores.length);
    expect(colorHospedero("aromo")).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("etiqueta con mayúscula inicial", () => {
    expect(etiquetaHospedero("quillay")).toBe("Quillay");
    expect(etiquetaHospedero("otro")).toBe("Otro");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- hosts`
Expected: FAIL (no existe el módulo `@/lib/hosts`).

- [ ] **Step 3: Escribir los tipos**

`src/lib/types.ts`:

```ts
export type Host = "aromo" | "colliguay" | "litre" | "quillay" | "otro";

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
}

export interface IdentifyResult {
  esQuintral: boolean;
  hospederoProbable: Host;
  confianza: number; // 0..1
  fenologia: string;
  notas: string;
}
```

- [ ] **Step 4: Escribir la implementación mínima**

`src/lib/hosts.ts`:

```ts
import type { Host } from "@/lib/types";

export const HOSPEDEROS: Host[] = ["aromo", "colliguay", "litre", "quillay", "otro"];

const COLORES: Record<Host, string> = {
  aromo: "#e0a106",
  colliguay: "#2e8b57",
  litre: "#8e44ad",
  quillay: "#c0392b",
  otro: "#7f8c8d",
};

export function colorHospedero(h: Host): string {
  return COLORES[h];
}

export function etiquetaHospedero(h: Host): string {
  return h.charAt(0).toUpperCase() + h.slice(1);
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- hosts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: tipos del dominio y helpers de hospederos"
```

---

### Task 3: Parser de la respuesta de la IA

**Files:**
- Create: `src/lib/identify.ts`
- Test: `src/lib/__tests__/identify.test.ts`

**Interfaces:**
- Consumes: `Host`, `IdentifyResult`, `HOSPEDEROS` (Tasks 2)
- Produces: `function parseIdentifyResult(raw: unknown): IdentifyResult` — normaliza/valida el JSON crudo de la IA. Hospedero desconocido → `"otro"`; confianza fuera de 0..1 → recortada; campos faltantes → valores por defecto seguros (`esQuintral: false`, `fenologia: ""`, `notas: ""`).
- Produces: `const PROMPT_IDENTIFY: string` — instrucción para la IA pidiendo exactamente esos campos.

- [ ] **Step 1: Escribir el test que falla**

`src/lib/__tests__/identify.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseIdentifyResult } from "@/lib/identify";

describe("parseIdentifyResult", () => {
  it("acepta una respuesta válida", () => {
    const r = parseIdentifyResult({
      esQuintral: true,
      hospederoProbable: "quillay",
      confianza: 0.82,
      fenologia: "en flor",
      notas: "hojas verdes",
    });
    expect(r).toEqual({
      esQuintral: true,
      hospederoProbable: "quillay",
      confianza: 0.82,
      fenologia: "en flor",
      notas: "hojas verdes",
    });
  });

  it("mapea hospedero desconocido a 'otro'", () => {
    const r = parseIdentifyResult({ hospederoProbable: "boldo" });
    expect(r.hospederoProbable).toBe("otro");
  });

  it("recorta la confianza al rango 0..1", () => {
    expect(parseIdentifyResult({ confianza: 5 }).confianza).toBe(1);
    expect(parseIdentifyResult({ confianza: -2 }).confianza).toBe(0);
  });

  it("usa valores por defecto seguros ante campos faltantes", () => {
    const r = parseIdentifyResult({});
    expect(r.esQuintral).toBe(false);
    expect(r.hospederoProbable).toBe("otro");
    expect(r.confianza).toBe(0);
    expect(r.fenologia).toBe("");
    expect(r.notas).toBe("");
  });

  it("no explota con entrada no-objeto", () => {
    expect(parseIdentifyResult(null).hospederoProbable).toBe("otro");
    expect(parseIdentifyResult("texto").esQuintral).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- identify`
Expected: FAIL (no existe `@/lib/identify`).

- [ ] **Step 3: Escribir la implementación mínima**

`src/lib/identify.ts`:

```ts
import type { Host, IdentifyResult } from "@/lib/types";
import { HOSPEDEROS } from "@/lib/hosts";

export const PROMPT_IDENTIFY = `Eres un asistente de botánica para un proyecto sobre el quintral chileno (Tristerix corymbosus), una planta hemiparásita.
Analiza la foto y responde SOLO con un objeto JSON, sin texto adicional, con esta forma exacta:
{
  "esQuintral": boolean,            // ¿se ve quintral en la foto?
  "hospederoProbable": string,      // uno de: aromo, colliguay, litre, quillay, otro
  "confianza": number,              // entre 0 y 1
  "fenologia": string,              // estado del ejemplar: "en flor", "con frutos", "vegetativo", etc.
  "notas": string                   // observación breve en español
}
Si no estás seguro del hospedero, usa "otro" y baja la confianza.`;

function asObject(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function toHost(value: unknown): Host {
  return HOSPEDEROS.includes(value as Host) ? (value as Host) : "otro";
}

function toConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function toStr(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseIdentifyResult(raw: unknown): IdentifyResult {
  const o = asObject(raw);
  return {
    esQuintral: o.esQuintral === true,
    hospederoProbable: toHost(o.hospederoProbable),
    confianza: toConfidence(o.confianza),
    fenologia: toStr(o.fenologia),
    notas: toStr(o.notas),
  };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- identify`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: parser y prompt de identificación por IA"
```

---

### Task 4: Ruta de servidor /api/identify (Claude Vision)

**Files:**
- Create: `src/app/api/identify/route.ts`
- Test: `src/app/api/identify/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `parseIdentifyResult`, `PROMPT_IDENTIFY` (Task 3)
- Produces: `POST /api/identify` — recibe JSON `{ imageBase64: string, mediaType: string }`, llama a Claude Vision, devuelve `IdentifyResult` como JSON. Errores → status 400/500 con `{ error: string }`.
- Produces: `function extractJson(text: string): unknown` — extrae el primer objeto `{...}` del texto de respuesta.

**Notas:** El SDK se mockea en los tests con `vi.mock("@anthropic-ai/sdk")`. La imagen se manda como bloque `image` base64 (ver doc TypeScript de claude-api, sección Vision). Se pide JSON por instrucción y se parsea con `extractJson` + `parseIdentifyResult`.

- [ ] **Step 1: Escribir el test que falla**

`src/app/api/identify/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

import { POST } from "@/app/api/identify/route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/identify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/identify", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("devuelve un IdentifyResult normalizado", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: 'Aquí está: {"esQuintral": true, "hospederoProbable": "quillay", "confianza": 0.9, "fenologia": "en flor", "notas": "ok"}',
        },
      ],
    });
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hospederoProbable).toBe("quillay");
    expect(data.esQuintral).toBe(true);
  });

  it("400 si falta la imagen", async () => {
    const res = await POST(req({ mediaType: "image/jpeg" }));
    expect(res.status).toBe(400);
  });

  it("500 si la IA falla", async () => {
    createMock.mockRejectedValue(new Error("boom"));
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- identify/route`
Expected: FAIL (no existe la ruta).

- [ ] **Step 3: Escribir la implementación mínima**

`src/app/api/identify/route.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { parseIdentifyResult, PROMPT_IDENTIFY } from "@/lib/identify";

export const runtime = "nodejs";

export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return {};
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: { imageBase64?: string; mediaType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { imageBase64, mediaType } = body;
  if (!imageBase64 || !mediaType) {
    return Response.json({ error: "Falta la imagen" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            { type: "text", text: PROMPT_IDENTIFY },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return Response.json(parseIdentifyResult(extractJson(text)));
  } catch {
    return Response.json({ error: "Falló el análisis de la imagen" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- identify/route`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ruta /api/identify con Claude Vision"
```

---

### Task 5: Capa de datos Supabase (migración, semilla, cliente, mapeo)

**Files:**
- Create: `supabase/migrations/0001_observaciones.sql`
- Create: `supabase/seed.sql`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/observations.ts`
- Test: `src/lib/__tests__/observations.test.ts`

**Interfaces:**
- Consumes: `Host`, `Observation` (Task 2)
- Produces: `function mapRowToObservation(row: ObservacionRow): Observation` — convierte la fila snake_case de Postgres al tipo camelCase.
- Produces: `type ObservacionRow` — forma de la fila en la DB.
- Produces: `function getSupabase(): SupabaseClient` — cliente del navegador (singleton).
- Produces: `async function fetchObservations(): Promise<Observation[]>`, `async function createObservation(input: NewObservation): Promise<Observation>`, `type NewObservation`.

- [ ] **Step 1: Escribir la migración y la semilla**

`supabase/migrations/0001_observaciones.sql`:

```sql
create table if not exists observaciones (
  id uuid primary key default gen_random_uuid(),
  nombre_observador text not null,
  lat double precision not null,
  lng double precision not null,
  hospedero text not null,
  hospedero_otro text,
  fenologia text not null default '',
  altitud integer,
  exposicion_solar text,
  foto_url text,
  resultado_ia jsonb,
  cerro text,
  creado_en timestamptz not null default now()
);

alter table observaciones enable row level security;

-- Aportes abiertos: cualquiera puede leer e insertar.
create policy "lectura publica" on observaciones for select using (true);
create policy "insercion publica" on observaciones for insert with check (true);

-- Storage: bucket público de fotos (crear también desde el panel de Supabase).
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy "fotos lectura" on storage.objects for select using (bucket_id = 'fotos');
create policy "fotos subida" on storage.objects for insert with check (bucket_id = 'fotos');
```

`supabase/seed.sql`:

```sql
insert into observaciones (nombre_observador, lat, lng, hospedero, fenologia, cerro) values
  ('Equipo Quintral Insight', -33.2129, -70.3416, 'litre', 'vegetativo', 'Manquehue'),
  ('Equipo Quintral Insight', -33.2125, -70.3418, 'litre', 'vegetativo', 'Manquehue'),
  ('Equipo Quintral Insight', -33.2124, -70.3416, 'quillay', 'vegetativo', 'Manquehue'),
  ('Equipo Quintral Insight', -33.2121, -70.3419, 'quillay', 'vegetativo', 'Manquehue'),
  ('Equipo Quintral Insight', -33.2117, -70.3426, 'quillay', 'vegetativo', 'Manquehue'),
  ('Equipo Quintral Insight', -33.2114, -70.3428, 'quillay', 'vegetativo', 'Manquehue');
```

- [ ] **Step 2: Escribir el test del mapeo que falla**

`src/lib/__tests__/observations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapRowToObservation } from "@/lib/observations";

describe("mapRowToObservation", () => {
  it("convierte snake_case a camelCase con tipos correctos", () => {
    const row = {
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
    };
    expect(mapRowToObservation(row)).toEqual({
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
    });
  });

  it("normaliza un hospedero desconocido a 'otro'", () => {
    const row = {
      id: "abc", nombre_observador: "Ana", lat: 0, lng: 0,
      hospedero: "desconocido", hospedero_otro: null, fenologia: "",
      altitud: null, exposicion_solar: null, foto_url: null,
      resultado_ia: null, cerro: null, creado_en: "2026-06-24T00:00:00Z",
    };
    expect(mapRowToObservation(row).hospedero).toBe("otro");
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test -- observations`
Expected: FAIL (no existe `@/lib/observations`).

- [ ] **Step 4: Escribir el cliente de Supabase**

`src/lib/supabase.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
```

- [ ] **Step 5: Escribir la capa de observaciones**

`src/lib/observations.ts`:

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
  };
}

export async function fetchObservations(): Promise<Observation[]> {
  const { data, error } = await getSupabase()
    .from("observaciones")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ObservacionRow[]).map(mapRowToObservation);
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
  return mapRowToObservation(data as ObservacionRow);
}
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npm test -- observations`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: capa de datos Supabase (migracion, semilla, observaciones)"
```

---

### Task 6: Sección del mapa con filtros

**Files:**
- Create: `src/lib/filterObservations.ts`
- Create: `src/components/MapSection.tsx`
- Create: `src/components/MapaQuintral.tsx`
- Test: `src/lib/__tests__/filterObservations.test.ts`

**Interfaces:**
- Consumes: `Observation`, `Host`, `colorHospedero`, `etiquetaHospedero` (Tasks 2)
- Produces: `function filterObservations(obs: Observation[], cerro: string | "todos", hospedero: Host | "todos"): Observation[]`
- Produces: `<MapSection observations={Observation[]} />` — render con filtros y el mapa.
- Produces: `<MapaQuintral observations={Observation[]} />` — wrapper de react-leaflet (carga dinámica, sin SSR).

**Notas:** Leaflet rompe en SSR; `MapaQuintral` se importa con `next/dynamic` y `{ ssr: false }` dentro de `MapSection`. Los marcadores se dibujan con `CircleMarker` coloreado por hospedero (evita configurar íconos de imagen de Leaflet). El CSS de Leaflet se importa en `MapaQuintral`.

- [ ] **Step 1: Escribir el test del filtro que falla**

`src/lib/__tests__/filterObservations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterObservations } from "@/lib/filterObservations";
import type { Observation } from "@/lib/types";

function obs(p: Partial<Observation>): Observation {
  return {
    id: "x", nombreObservador: "a", lat: 0, lng: 0, hospedero: "quillay",
    hospederoOtro: null, fenologia: "", altitud: null, exposicionSolar: null,
    fotoUrl: null, cerro: "Manquehue", creadoEn: "", ...p,
  };
}

describe("filterObservations", () => {
  const data = [
    obs({ id: "1", cerro: "Manquehue", hospedero: "quillay" }),
    obs({ id: "2", cerro: "El Carbón", hospedero: "litre" }),
    obs({ id: "3", cerro: "Manquehue", hospedero: "litre" }),
  ];

  it("'todos' y 'todos' devuelve todo", () => {
    expect(filterObservations(data, "todos", "todos")).toHaveLength(3);
  });

  it("filtra por cerro", () => {
    expect(filterObservations(data, "Manquehue", "todos").map((o) => o.id)).toEqual(["1", "3"]);
  });

  it("filtra por hospedero", () => {
    expect(filterObservations(data, "todos", "litre").map((o) => o.id)).toEqual(["2", "3"]);
  });

  it("combina ambos filtros", () => {
    expect(filterObservations(data, "Manquehue", "litre").map((o) => o.id)).toEqual(["3"]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- filterObservations`
Expected: FAIL.

- [ ] **Step 3: Escribir el filtro**

`src/lib/filterObservations.ts`:

```ts
import type { Host, Observation } from "@/lib/types";

export function filterObservations(
  obs: Observation[],
  cerro: string | "todos",
  hospedero: Host | "todos",
): Observation[] {
  return obs.filter(
    (o) =>
      (cerro === "todos" || o.cerro === cerro) &&
      (hospedero === "todos" || o.hospedero === hospedero),
  );
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- filterObservations`
Expected: PASS.

- [ ] **Step 5: Escribir el mapa de react-leaflet**

`src/components/MapaQuintral.tsx`:

```tsx
"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Observation } from "@/lib/types";
import { colorHospedero, etiquetaHospedero } from "@/lib/hosts";

export default function MapaQuintral({ observations }: { observations: Observation[] }) {
  const centro: [number, number] = observations.length
    ? [observations[0].lat, observations[0].lng]
    : [-33.2123, -70.342];

  return (
    <MapContainer center={centro} zoom={14} style={{ height: 480, width: "100%" }}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {observations.map((o) => (
        <CircleMarker
          key={o.id}
          center={[o.lat, o.lng]}
          radius={8}
          pathOptions={{ color: colorHospedero(o.hospedero), fillOpacity: 0.8 }}
        >
          <Popup>
            <strong>{etiquetaHospedero(o.hospedero)}</strong>
            <br />
            {o.fenologia || "sin fenología"}
            <br />
            {o.cerro ?? ""} · {o.nombreObservador}
            {o.fotoUrl ? (
              <>
                <br />
                <img src={o.fotoUrl} alt="ejemplar" style={{ width: 160, marginTop: 4 }} />
              </>
            ) : null}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 6: Escribir la sección con filtros**

`src/components/MapSection.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Host, Observation } from "@/lib/types";
import { HOSPEDEROS, etiquetaHospedero } from "@/lib/hosts";
import { filterObservations } from "@/lib/filterObservations";

const MapaQuintral = dynamic(() => import("@/components/MapaQuintral"), { ssr: false });

export default function MapSection({ observations }: { observations: Observation[] }) {
  const [cerro, setCerro] = useState<string | "todos">("todos");
  const [hospedero, setHospedero] = useState<Host | "todos">("todos");

  const cerros = useMemo(
    () => Array.from(new Set(observations.map((o) => o.cerro).filter(Boolean))) as string[],
    [observations],
  );
  const visibles = useMemo(
    () => filterObservations(observations, cerro, hospedero),
    [observations, cerro, hospedero],
  );

  return (
    <section id="mapa" style={{ padding: "2rem 1rem", maxWidth: 1000, margin: "0 auto" }}>
      <h2>Mapa georreferenciado de registros</h2>
      <div style={{ display: "flex", gap: "1rem", margin: "1rem 0", flexWrap: "wrap" }}>
        <label>
          Cerro:{" "}
          <select value={cerro} onChange={(e) => setCerro(e.target.value)}>
            <option value="todos">Todos</option>
            {cerros.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Hospedero:{" "}
          <select value={hospedero} onChange={(e) => setHospedero(e.target.value as Host | "todos")}>
            <option value="todos">Todos</option>
            {HOSPEDEROS.map((h) => (
              <option key={h} value={h}>{etiquetaHospedero(h)}</option>
            ))}
          </select>
        </label>
      </div>
      <MapaQuintral observations={visibles} />
    </section>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: seccion de mapa con filtros por cerro y hospedero"
```

---

### Task 7: Formulario de aporte (ciencia ciudadana)

**Files:**
- Create: `src/lib/validateObservation.ts`
- Create: `src/components/ContributeForm.tsx`
- Test: `src/lib/__tests__/validateObservation.test.ts`

**Interfaces:**
- Consumes: `Host` (Task 2), `NewObservation`, `createObservation` (Task 5)
- Produces: `interface FormState { nombreObservador: string; lat: string; lng: string; hospedero: Host; hospederoOtro: string; fenologia: string; altitud: string; exposicionSolar: string; cerro: string; }`
- Produces: `function validateObservation(f: FormState): string[]` — lista de errores (vacía si es válido). Requiere nombre, lat/lng numéricos en rango, fenología no vacía, y `hospederoOtro` si `hospedero === "otro"`.
- Produces: `<ContributeForm prefill={Partial<FormState> & { fotoUrl?: string; resultadoIa?: unknown } | null} onCreated={(o: Observation) => void} />`

**Notas:** El formulario sube la foto (si viene del prefill como `File`/dataURL ya subido por la sección de IA) — para mantenerlo simple, la subida de la foto a Storage la hace la sección de IA (Task 8) y pasa `fotoUrl` por prefill. El formulario también permite "usar mi ubicación" con `navigator.geolocation`; si se deniega, el usuario escribe lat/lng a mano.

- [ ] **Step 1: Escribir el test de validación que falla**

`src/lib/__tests__/validateObservation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateObservation, type FormState } from "@/lib/validateObservation";

function base(p: Partial<FormState> = {}): FormState {
  return {
    nombreObservador: "Ana", lat: "-33.2", lng: "-70.3", hospedero: "quillay",
    hospederoOtro: "", fenologia: "en flor", altitud: "", exposicionSolar: "", cerro: "Manquehue", ...p,
  };
}

describe("validateObservation", () => {
  it("acepta un formulario válido", () => {
    expect(validateObservation(base())).toEqual([]);
  });

  it("exige nombre", () => {
    expect(validateObservation(base({ nombreObservador: "" }))).toContain("Falta el nombre del observador.");
  });

  it("exige coordenadas numéricas en rango", () => {
    expect(validateObservation(base({ lat: "abc" }))).toContain("La latitud debe ser un número válido.");
    expect(validateObservation(base({ lng: "200" }))).toContain("La longitud debe estar entre -180 y 180.");
  });

  it("exige fenología", () => {
    expect(validateObservation(base({ fenologia: "" }))).toContain("Falta la fenología/estado del ejemplar.");
  });

  it("exige hospederoOtro cuando hospedero es 'otro'", () => {
    expect(validateObservation(base({ hospedero: "otro", hospederoOtro: "" }))).toContain(
      "Indica el nombre del nuevo hospedero.",
    );
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- validateObservation`
Expected: FAIL.

- [ ] **Step 3: Escribir la validación**

`src/lib/validateObservation.ts`:

```ts
import type { Host } from "@/lib/types";

export interface FormState {
  nombreObservador: string;
  lat: string;
  lng: string;
  hospedero: Host;
  hospederoOtro: string;
  fenologia: string;
  altitud: string;
  exposicionSolar: string;
  cerro: string;
}

export function validateObservation(f: FormState): string[] {
  const errores: string[] = [];
  if (!f.nombreObservador.trim()) errores.push("Falta el nombre del observador.");

  const lat = Number(f.lat);
  if (f.lat.trim() === "" || Number.isNaN(lat)) errores.push("La latitud debe ser un número válido.");
  else if (lat < -90 || lat > 90) errores.push("La latitud debe estar entre -90 y 90.");

  const lng = Number(f.lng);
  if (f.lng.trim() === "" || Number.isNaN(lng)) errores.push("La longitud debe ser un número válido.");
  else if (lng < -180 || lng > 180) errores.push("La longitud debe estar entre -180 y 180.");

  if (!f.fenologia.trim()) errores.push("Falta la fenología/estado del ejemplar.");
  if (f.hospedero === "otro" && !f.hospederoOtro.trim())
    errores.push("Indica el nombre del nuevo hospedero.");

  return errores;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- validateObservation`
Expected: PASS.

- [ ] **Step 5: Escribir el formulario**

`src/components/ContributeForm.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { Host, Observation } from "@/lib/types";
import { HOSPEDEROS, etiquetaHospedero } from "@/lib/hosts";
import { validateObservation, type FormState } from "@/lib/validateObservation";
import { createObservation } from "@/lib/observations";

export interface Prefill extends Partial<FormState> {
  fotoUrl?: string | null;
  resultadoIa?: unknown;
}

const VACIO: FormState = {
  nombreObservador: "", lat: "", lng: "", hospedero: "quillay",
  hospederoOtro: "", fenologia: "", altitud: "", exposicionSolar: "", cerro: "",
};

export default function ContributeForm({
  prefill,
  onCreated,
}: {
  prefill: Prefill | null;
  onCreated: (o: Observation) => void;
}) {
  const [form, setForm] = useState<FormState>(VACIO);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [resultadoIa, setResultadoIa] = useState<unknown>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setForm((f) => ({ ...f, ...prefill }) as FormState);
    setFotoUrl(prefill.fotoUrl ?? null);
    setResultadoIa(prefill.resultadoIa ?? null);
  }, [prefill]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function usarUbicacion() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        set("lat", String(pos.coords.latitude));
        set("lng", String(pos.coords.longitude));
      },
      () => setErrores(["No se pudo obtener la ubicación; ingrésala manualmente."]),
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateObservation(form);
    setErrores(errs);
    if (errs.length) return;
    setEnviando(true);
    try {
      const o = await createObservation({
        nombreObservador: form.nombreObservador.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        hospedero: form.hospedero,
        hospederoOtro: form.hospedero === "otro" ? form.hospederoOtro.trim() : null,
        fenologia: form.fenologia.trim(),
        altitud: form.altitud.trim() ? Number(form.altitud) : null,
        exposicionSolar: form.exposicionSolar.trim() || null,
        fotoUrl,
        resultadoIa,
        cerro: form.cerro.trim() || null,
      });
      onCreated(o);
      setOk(true);
      setForm(VACIO);
      setFotoUrl(null);
      setResultadoIa(null);
    } catch (err) {
      setErrores([err instanceof Error ? err.message : "Error al guardar el registro."]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section id="aportar" style={{ padding: "2rem 1rem", maxWidth: 1000, margin: "0 auto" }}>
      <h2>Aporta tus propias observaciones</h2>
      <form onSubmit={enviar} style={{ display: "grid", gap: ".75rem", maxWidth: 520 }}>
        <input placeholder="Tu nombre" value={form.nombreObservador}
          onChange={(e) => set("nombreObservador", e.target.value)} />
        <div style={{ display: "flex", gap: ".5rem" }}>
          <input placeholder="Latitud" value={form.lat} onChange={(e) => set("lat", e.target.value)} />
          <input placeholder="Longitud" value={form.lng} onChange={(e) => set("lng", e.target.value)} />
          <button type="button" onClick={usarUbicacion}>Usar mi ubicación</button>
        </div>
        <select value={form.hospedero} onChange={(e) => set("hospedero", e.target.value as Host)}>
          {HOSPEDEROS.map((h) => (
            <option key={h} value={h}>{etiquetaHospedero(h)}</option>
          ))}
        </select>
        {form.hospedero === "otro" && (
          <input placeholder="Nuevo hospedero" value={form.hospederoOtro}
            onChange={(e) => set("hospederoOtro", e.target.value)} />
        )}
        <input placeholder="Fenología / estado" value={form.fenologia}
          onChange={(e) => set("fenologia", e.target.value)} />
        <input placeholder="Altitud (m, opcional)" value={form.altitud}
          onChange={(e) => set("altitud", e.target.value)} />
        <input placeholder="Exposición solar (opcional)" value={form.exposicionSolar}
          onChange={(e) => set("exposicionSolar", e.target.value)} />
        <input placeholder="Cerro (opcional)" value={form.cerro}
          onChange={(e) => set("cerro", e.target.value)} />
        {errores.length > 0 && (
          <ul style={{ color: "#c0392b" }}>{errores.map((er) => <li key={er}>{er}</li>)}</ul>
        )}
        {ok && <p style={{ color: "#1f3d2b" }}>¡Registro agregado al mapa!</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar observación"}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: formulario de ciencia ciudadana con validacion y geolocalizacion"
```

---

### Task 8: Sección de identificación con IA + subida de foto

**Files:**
- Create: `src/lib/fileToBase64.ts`
- Create: `src/lib/uploadFoto.ts`
- Create: `src/components/IdentifySection.tsx`
- Test: `src/lib/__tests__/fileToBase64.test.ts`

**Interfaces:**
- Consumes: `IdentifyResult` (Task 2), `Prefill` (Task 7), `getSupabase` (Task 5)
- Produces: `async function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }>`
- Produces: `async function uploadFoto(file: File): Promise<string>` — sube a Storage bucket `fotos`, devuelve URL pública.
- Produces: `<IdentifySection onPrefill={(p: Prefill) => void} />` — sube foto, llama a `/api/identify`, muestra resultado, y un botón "Agregar al mapa" que llama `onPrefill` con hospedero/fenología/fotoUrl/resultadoIa.

**Notas:** `fileToBase64` extrae el `data:<mediaType>;base64,<datos>` con `FileReader` y separa el mediaType de los datos. En el test se mockea `FileReader` con un resultado de data URL.

- [ ] **Step 1: Escribir el test que falla**

`src/lib/__tests__/fileToBase64.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { fileToBase64 } from "@/lib/fileToBase64";

describe("fileToBase64", () => {
  it("separa mediaType y datos de un data URL", async () => {
    class FR {
      result = "data:image/png;base64,QUJD";
      onload: (() => void) | null = null;
      readAsDataURL() { this.onload?.(); }
    }
    vi.stubGlobal("FileReader", FR);
    const file = { name: "x.png" } as File;
    const out = await fileToBase64(file);
    expect(out).toEqual({ base64: "QUJD", mediaType: "image/png" });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- fileToBase64`
Expected: FAIL.

- [ ] **Step 3: Escribir fileToBase64**

`src/lib/fileToBase64.ts`:

```ts
export function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const match = /^data:(.+);base64,(.*)$/.exec(result);
      if (!match) return reject(new Error("No se pudo leer la imagen"));
      resolve({ mediaType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- fileToBase64`
Expected: PASS.

- [ ] **Step 5: Escribir uploadFoto**

`src/lib/uploadFoto.ts`:

```ts
import { getSupabase } from "@/lib/supabase";

export async function uploadFoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const ruta = `${crypto.randomUUID()}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("fotos").upload(ruta, file);
  if (error) throw new Error(error.message);
  return supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
}
```

- [ ] **Step 6: Escribir la sección de identificación**

`src/components/IdentifySection.tsx`:

```tsx
"use client";
import { useState } from "react";
import type { IdentifyResult } from "@/lib/types";
import { etiquetaHospedero } from "@/lib/hosts";
import { fileToBase64 } from "@/lib/fileToBase64";
import { uploadFoto } from "@/lib/uploadFoto";
import type { Prefill } from "@/components/ContributeForm";

export default function IdentifySection({ onPrefill }: { onPrefill: (p: Prefill) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<IdentifyResult | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analizar() {
    if (!archivo) return;
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const url = await uploadFoto(archivo);
      setFotoUrl(url);
      const { base64, mediaType } = await fileToBase64(archivo);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      if (!res.ok) throw new Error("La IA no pudo analizar la imagen.");
      setResultado((await res.json()) as IdentifyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al analizar.");
    } finally {
      setCargando(false);
    }
  }

  function agregarAlMapa() {
    if (!resultado) return;
    onPrefill({
      hospedero: resultado.hospederoProbable,
      fenologia: resultado.fenologia,
      fotoUrl,
      resultadoIa: resultado,
    });
    document.getElementById("aportar")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="identificar" style={{ padding: "2rem 1rem", maxWidth: 1000, margin: "0 auto" }}>
      <h2>Identificación automática con IA</h2>
      <p>Sube una foto del ejemplar. El modelo estima especie, hospedero y fenología.</p>
      <input type="file" accept="image/*" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      <button onClick={analizar} disabled={!archivo || cargando}>
        {cargando ? "Analizando…" : "Analizar"}
      </button>
      {error && <p style={{ color: "#c0392b" }}>{error}</p>}
      {resultado && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>¿Es quintral?</strong> {resultado.esQuintral ? "Sí" : "No con certeza"}</p>
          <p><strong>Hospedero probable:</strong> {etiquetaHospedero(resultado.hospederoProbable)} ({Math.round(resultado.confianza * 100)}%)</p>
          <p><strong>Fenología:</strong> {resultado.fenologia || "—"}</p>
          <p>{resultado.notas}</p>
          {resultado.confianza < 0.5 && (
            <p style={{ color: "#c0392b" }}>Baja confianza: confirma el hospedero a mano en el formulario.</p>
          )}
          <button onClick={agregarAlMapa}>Agregar al mapa</button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: seccion de identificacion por IA con subida de foto"
```

---

### Task 9: Composición de la página (Hero, Nav, Footer, estado compartido)

**Files:**
- Create: `src/components/Hero.tsx`
- Create: `src/components/Nav.tsx`
- Create: `src/components/Footer.tsx`
- Create: `src/components/HomeClient.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `fetchObservations` (Task 5), `MapSection` (Task 6), `ContributeForm` + `Prefill` (Task 7), `IdentifySection` (Task 8)
- Produces: `<HomeClient />` — componente cliente que carga observaciones, mantiene el `prefill` compartido entre IdentifySection y ContributeForm, y agrega al estado los registros nuevos para que aparezcan al instante en el mapa.

**Notas:** `page.tsx` queda como Server Component que renderiza `<Nav/>`, `<Hero/>`, `<HomeClient/>` y `<Footer/>`. `HomeClient` es `"use client"` y orquesta el estado.

- [ ] **Step 1: Escribir Hero, Nav y Footer**

`src/components/Nav.tsx`:

```tsx
export default function Nav() {
  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "1rem", background: "#1f3d2b", color: "#fff" }}>
      <strong style={{ flex: 1 }}>Quintral Insight</strong>
      <a href="#identificar" style={{ color: "#fff" }}>Identificar</a>
      <a href="#mapa" style={{ color: "#fff" }}>Mapa</a>
      <a href="#aportar" style={{ color: "#fff" }}>Aportar</a>
    </nav>
  );
}
```

`src/components/Hero.tsx`:

```tsx
export default function Hero() {
  return (
    <header style={{ padding: "3rem 1rem", textAlign: "center" }}>
      <p style={{ letterSpacing: 2, color: "#1f3d2b" }}>CIENCIA ABIERTA DEL BOSQUE ESCLERÓFILO</p>
      <h1 style={{ fontSize: "2.5rem", margin: ".5rem 0" }}>
        Descubriendo el <span style={{ color: "#c0392b" }}>quintral</span> de la cordillera central
      </h1>
      <p style={{ maxWidth: 600, margin: "0 auto" }}>
        Identificación con IA, mapa georreferenciado y ciencia ciudadana sobre el quintral
        (<em>Tristerix corymbosus</em>) y sus árboles hospederos en Chile.
      </p>
    </header>
  );
}
```

`src/components/Footer.tsx`:

```tsx
export default function Footer() {
  return (
    <footer style={{ padding: "2rem 1rem", background: "#1f3d2b", color: "#fff", marginTop: "2rem" }}>
      <p>Quintral Insight · Proyecto de Ciencias y Tecnología 2026</p>
      <p style={{ opacity: 0.8 }}>Plataforma de monitoreo ecológico y fitoquímico del quintral.</p>
    </footer>
  );
}
```

- [ ] **Step 2: Escribir HomeClient**

`src/components/HomeClient.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import { fetchObservations } from "@/lib/observations";
import IdentifySection from "@/components/IdentifySection";
import MapSection from "@/components/MapSection";
import ContributeForm, { type Prefill } from "@/components/ContributeForm";

export default function HomeClient() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  useEffect(() => {
    fetchObservations().then(setObservations).catch(() => setObservations([]));
  }, []);

  return (
    <>
      <IdentifySection onPrefill={setPrefill} />
      <MapSection observations={observations} />
      <ContributeForm
        prefill={prefill}
        onCreated={(o) => setObservations((prev) => [o, ...prev])}
      />
    </>
  );
}
```

- [ ] **Step 3: Reescribir page.tsx**

`src/app/page.tsx`:

```tsx
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import HomeClient from "@/components/HomeClient";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <HomeClient />
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Verificar el build y la suite completa**

Run: `npm test`
Expected: PASS (todas las suites de Tasks 1-8).

Run: `npm run build`
Expected: build de Next.js exitoso (compila TypeScript sin errores).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: composicion de la pagina y estado compartido del core loop"
```

---

## Verificación manual final (tras configurar Supabase)

1. Crear proyecto en Supabase; correr `supabase/migrations/0001_observaciones.sql` y `supabase/seed.sql` en el SQL editor; crear el bucket público `fotos`.
2. Copiar `.env.local.example` a `.env.local` y completar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.
3. `npm run dev` → abrir la app: el mapa muestra los 6 puntos semilla del Manquehue.
4. Subir una foto en "Identificación con IA" → ver el resultado → "Agregar al mapa" → completar coordenadas → enviar → el punto nuevo aparece en el mapa al instante.
