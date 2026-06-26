# Banco de evaluación de hospederos (Sub-proyecto A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un banco de evaluación con fotos etiquetadas de iNaturalist y medir el acierto del identificador de hospederos (top-1 / top-2), de forma reproducible y visible en una página.

**Architecture:** Se extrae el núcleo de identificación a `src/lib/identifyClient.ts` para que app y evaluador usen el mismo código. Dos scripts de terminal (`fetch-dataset`, `run-eval`) bajan el dataset y miden, apoyándose en funciones puras testeadas (`metrics`, `urlsDeFotos`, `evaluarManifiesto`). Una página server-component `/evaluacion` lee el último JSON de resultados.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest, `tsx` (runner de scripts TS), API pública de iNaturalist, SDK `@anthropic-ai/sdk`.

## Global Constraints

- Tests con **Vitest**; correr con `npm test` (`vitest run`). Tests en carpetas `__tests__` junto al código.
- Alias de imports: `@/*` → `./src/*` (configurado en `tsconfig.json` y `vitest.config.ts`). Los scripts bajo `scripts/` se ejecutan con `tsx`, que resuelve los mismos `paths` del `tsconfig.json` raíz.
- Modelo de IA: `"claude-opus-4-8"`, `max_tokens: 1024` (no cambiar).
- Los slugs de hospedero salen del tipo `Host` de `@/lib/types`. Nombres legibles en `@/lib/hosts` (`etiquetaHospedero`).
- Las imágenes descargadas viven en `eval/dataset/` y **NO se commitean**; los resultados en `eval/results/` **sí** se commitean.
- Idioma del código y la UI: español (nombres de funciones/variables y textos visibles).
- Tipos compartidos entre scripts y página viven en `src/lib/evalTypes.ts` (importable como `@/lib/evalTypes` desde ambos).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/identifyClient.ts` | **Nuevo.** `identificarHospedero()` + lista de media types. Núcleo reutilizable. |
| `src/app/api/identify/route.ts` | **Modificar.** Capa delgada que valida y delega en `identificarHospedero`. |
| `src/lib/evalTypes.ts` | **Nuevo.** Tipos `ManifestItem`, `Manifest`, `Prediccion`, `EvalResult`, etc. |
| `scripts/eval/metrics.ts` | **Nuevo.** `calcularMetricas()` — función pura. |
| `scripts/eval/inaturalist.ts` | **Nuevo.** Llamadas a iNaturalist + `urlsDeFotos()` pura. |
| `scripts/eval/species.config.ts` | **Nuevo.** Lista de especies a evaluar. |
| `scripts/eval/fetch-dataset.ts` | **Nuevo.** CLI: baja fotos y escribe el manifiesto. |
| `scripts/eval/evaluate.ts` | **Nuevo.** `evaluarManifiesto()` — bucle de evaluación con identificador inyectable. |
| `scripts/eval/run-eval.ts` | **Nuevo.** CLI: corre la evaluación y escribe resultados. |
| `src/app/evaluacion/page.tsx` | **Nuevo.** Página de resultados (server component). |
| `package.json` | **Modificar.** Devdep `tsx`; scripts `eval:fetch`, `eval:run`. |
| `.gitignore` | **Modificar.** Ignorar `eval/dataset/`. |

---

## Task 1: Extraer `identifyClient` y adelgazar la ruta API

**Files:**
- Create: `src/lib/identifyClient.ts`
- Create: `src/lib/__tests__/identifyClient.test.ts`
- Modify: `src/app/api/identify/route.ts`

**Interfaces:**
- Consumes: `PROMPT_IDENTIFY`, `extractJson`, `parseIdentifyResult` de `@/lib/identify`; `IdentifyResult` de `@/lib/types`.
- Produces:
  - `ALLOWED_MEDIA_TYPES: readonly ["image/jpeg","image/png","image/webp","image/gif"]`
  - `type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number]`
  - `identificarHospedero(imagenBase64: string, mediaType: AllowedMediaType): Promise<IdentifyResult>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/__tests__/identifyClient.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

import { identificarHospedero } from "@/lib/identifyClient";

describe("identificarHospedero", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("parsea la respuesta de la IA a un IdentifyResult", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"esQuintral": true, "opciones": [{"hospedero": "quillay", "confianza": 0.9}, {"hospedero": "litre", "confianza": 0.5}], "fenologia": "en flor", "notas": "ok"}',
        },
      ],
    });
    const r = await identificarHospedero("AAAA", "image/jpeg");
    expect(r.esQuintral).toBe(true);
    expect(r.opciones[0].hospedero).toBe("quillay");
    expect(r.opciones[1].hospedero).toBe("litre");
  });

  it("pasa la imagen y el mediaType a la IA", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    await identificarHospedero("ZZZZ", "image/png");
    const arg = createMock.mock.calls[0][0];
    const imgBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "image");
    expect(imgBlock.source.data).toBe("ZZZZ");
    expect(imgBlock.source.media_type).toBe("image/png");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- identifyClient`
Expected: FAIL — "Cannot find module '@/lib/identifyClient'".

- [ ] **Step 3: Implementar `identifyClient.ts`**

Crear `src/lib/identifyClient.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { parseIdentifyResult, extractJson, PROMPT_IDENTIFY } from "@/lib/identify";
import type { IdentifyResult } from "@/lib/types";

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

export async function identificarHospedero(
  imagenBase64: string,
  mediaType: AllowedMediaType,
): Promise<IdentifyResult> {
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
            source: { type: "base64", media_type: mediaType, data: imagenBase64 },
          },
          { type: "text", text: PROMPT_IDENTIFY },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseIdentifyResult(extractJson(text));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- identifyClient`
Expected: PASS (2 tests).

- [ ] **Step 5: Refactorizar `route.ts` para usar el cliente**

Reemplazar el contenido completo de `src/app/api/identify/route.ts`:

```typescript
import {
  identificarHospedero,
  ALLOWED_MEDIA_TYPES,
  type AllowedMediaType,
} from "@/lib/identifyClient";

export const runtime = "nodejs";

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

  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as AllowedMediaType)) {
    return Response.json({ error: "mediaType no soportado" }, { status: 400 });
  }

  try {
    const resultado = await identificarHospedero(imageBase64, mediaType as AllowedMediaType);
    return Response.json(resultado);
  } catch {
    return Response.json({ error: "Falló el análisis de la imagen" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Correr toda la suite y verificar que el test de la ruta sigue pasando**

Run: `npm test`
Expected: PASS — incluye `route.test.ts` (4 tests) y `identifyClient.test.ts` (2 tests) sin cambios en `route.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/identifyClient.ts src/lib/__tests__/identifyClient.test.ts src/app/api/identify/route.ts
git commit -m "refactor: extraer identificarHospedero a identifyClient reutilizable"
```

---

## Task 2: Tipos de evaluación y cálculo de métricas

**Files:**
- Create: `src/lib/evalTypes.ts`
- Create: `scripts/eval/metrics.ts`
- Create: `scripts/eval/__tests__/metrics.test.ts`

**Interfaces:**
- Consumes: `Host` de `@/lib/types`.
- Produces:
  - Tipos en `@/lib/evalTypes`: `ManifestItem`, `Manifest`, `Prediccion`, `AciertoEspecie`, `Confusion`, `EvalResult`.
  - `calcularMetricas(predicciones: Prediccion[], generadoEl: string): EvalResult` en `scripts/eval/metrics.ts`.

- [ ] **Step 1: Crear los tipos compartidos**

Crear `src/lib/evalTypes.ts`:

```typescript
import type { Host } from "@/lib/types";

export interface ManifestItem {
  archivo: string; // ruta relativa dentro de eval/dataset, ej "litre/12345.jpg"
  hospedero: Host; // verdad de terreno
  fuente: string; // url de la observación en iNaturalist
}

export interface Manifest {
  generadoEl: string;
  items: ManifestItem[];
}

export interface Prediccion {
  archivo: string;
  verdadero: Host;
  top1: Host;
  top2: Host;
  conf1: number;
  conf2: number;
}

export interface AciertoEspecie {
  hospedero: Host;
  n: number;
  aciertoTop1: number;
  aciertoTop2: number;
}

export interface Confusion {
  verdadero: Host;
  predicho: Host;
  veces: number;
}

export interface EvalResult {
  generadoEl: string;
  totalImagenes: number;
  aciertoTop1: number;
  aciertoTop2: number;
  porEspecie: AciertoEspecie[];
  confusiones: Confusion[];
  confianzaPromedioAcierto: number;
  confianzaPromedioError: number;
  predicciones: Prediccion[];
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `scripts/eval/__tests__/metrics.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calcularMetricas } from "../metrics";
import type { Prediccion } from "@/lib/evalTypes";

const preds: Prediccion[] = [
  { archivo: "litre/1.jpg", verdadero: "litre", top1: "litre", top2: "peumo", conf1: 0.8, conf2: 0.3 }, // top1 ok
  { archivo: "litre/2.jpg", verdadero: "litre", top1: "peumo", top2: "litre", conf1: 0.6, conf2: 0.4 }, // top2 ok
  { archivo: "litre/3.jpg", verdadero: "litre", top1: "peumo", top2: "boldo", conf1: 0.5, conf2: 0.2 }, // fallo
  { archivo: "boldo/1.jpg", verdadero: "boldo", top1: "boldo", top2: "litre", conf1: 0.9, conf2: 0.2 }, // top1 ok
];

describe("calcularMetricas", () => {
  it("calcula acierto top-1 y top-2 globales", () => {
    const r = calcularMetricas(preds, "2026-06-26T00:00:00.000Z");
    expect(r.totalImagenes).toBe(4);
    expect(r.aciertoTop1).toBeCloseTo(0.5); // 2 de 4
    expect(r.aciertoTop2).toBeCloseTo(0.75); // 3 de 4
  });

  it("desglosa por especie", () => {
    const r = calcularMetricas(preds, "x");
    const litre = r.porEspecie.find((e) => e.hospedero === "litre")!;
    expect(litre.n).toBe(3);
    expect(litre.aciertoTop1).toBeCloseTo(1 / 3);
    expect(litre.aciertoTop2).toBeCloseTo(2 / 3);
  });

  it("cuenta pares de confusión solo de los fallos top-1, ordenados", () => {
    const r = calcularMetricas(preds, "x");
    expect(r.confusiones[0]).toEqual({ verdadero: "litre", predicho: "peumo", veces: 2 });
  });

  it("promedia confianza de aciertos vs errores", () => {
    const r = calcularMetricas(preds, "x");
    expect(r.confianzaPromedioAcierto).toBeCloseTo((0.8 + 0.9) / 2);
    expect(r.confianzaPromedioError).toBeCloseTo((0.6 + 0.5) / 2);
  });

  it("no rompe con lista vacía", () => {
    const r = calcularMetricas([], "x");
    expect(r.totalImagenes).toBe(0);
    expect(r.aciertoTop1).toBe(0);
    expect(r.confianzaPromedioAcierto).toBe(0);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test -- metrics`
Expected: FAIL — "Cannot find module '../metrics'".

- [ ] **Step 4: Implementar `metrics.ts`**

Crear `scripts/eval/metrics.ts`:

```typescript
import type { Host } from "@/lib/types";
import type { Prediccion, EvalResult, AciertoEspecie, Confusion } from "@/lib/evalTypes";

function promedio(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const aciertoTop1 = (p: Prediccion) => p.verdadero === p.top1;
const aciertoTop2 = (p: Prediccion) => p.verdadero === p.top1 || p.verdadero === p.top2;

export function calcularMetricas(predicciones: Prediccion[], generadoEl: string): EvalResult {
  const total = predicciones.length;

  const porEspecieMap = new Map<Host, Prediccion[]>();
  for (const p of predicciones) {
    const arr = porEspecieMap.get(p.verdadero) ?? [];
    arr.push(p);
    porEspecieMap.set(p.verdadero, arr);
  }

  const porEspecie: AciertoEspecie[] = Array.from(porEspecieMap.entries()).map(
    ([hospedero, ps]) => ({
      hospedero,
      n: ps.length,
      aciertoTop1: ps.filter(aciertoTop1).length / ps.length,
      aciertoTop2: ps.filter(aciertoTop2).length / ps.length,
    }),
  );

  const confusionMap = new Map<string, Confusion>();
  for (const p of predicciones) {
    if (aciertoTop1(p)) continue;
    const clave = `${p.verdadero}->${p.top1}`;
    const prev = confusionMap.get(clave);
    if (prev) prev.veces += 1;
    else confusionMap.set(clave, { verdadero: p.verdadero, predicho: p.top1, veces: 1 });
  }
  const confusiones = Array.from(confusionMap.values()).sort((a, b) => b.veces - a.veces);

  const aciertos = predicciones.filter(aciertoTop1);
  const errores = predicciones.filter((p) => !aciertoTop1(p));

  return {
    generadoEl,
    totalImagenes: total,
    aciertoTop1: total === 0 ? 0 : aciertos.length / total,
    aciertoTop2: total === 0 ? 0 : predicciones.filter(aciertoTop2).length / total,
    porEspecie,
    confusiones,
    confianzaPromedioAcierto: promedio(aciertos.map((p) => p.conf1)),
    confianzaPromedioError: promedio(errores.map((p) => p.conf1)),
    predicciones,
  };
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- metrics`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/evalTypes.ts scripts/eval/metrics.ts scripts/eval/__tests__/metrics.test.ts
git commit -m "feat: tipos de evaluacion y calculo de metricas top-1/top-2"
```

---

## Task 3: Cliente de iNaturalist

**Files:**
- Create: `scripts/eval/inaturalist.ts`
- Create: `scripts/eval/__tests__/inaturalist.test.ts`

**Interfaces:**
- Produces:
  - `interface INatObservation { id: number; uri?: string; photos: { id: number; url: string }[] }`
  - `buscarTaxonId(nombreCientifico: string): Promise<number | null>`
  - `obtenerObservaciones(taxonId: number, perPage: number): Promise<INatObservation[]>`
  - `urlsDeFotos(observaciones: INatObservation[], max: number): { id: number; url: string; fuente: string }[]` (pura)

- [ ] **Step 1: Escribir el test que falla**

Crear `scripts/eval/__tests__/inaturalist.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { urlsDeFotos, buscarTaxonId, obtenerObservaciones } from "../inaturalist";
import type { INatObservation } from "../inaturalist";

describe("urlsDeFotos (pura)", () => {
  it("toma la primera foto de cada observación y la sube a tamaño medium", () => {
    const obs: INatObservation[] = [
      { id: 1, uri: "https://inat/1", photos: [{ id: 10, url: "https://x/square.jpg" }] },
      { id: 2, uri: "https://inat/2", photos: [{ id: 20, url: "https://y/square.jpg" }] },
    ];
    const out = urlsDeFotos(obs, 5);
    expect(out).toEqual([
      { id: 1, url: "https://x/medium.jpg", fuente: "https://inat/1" },
      { id: 2, url: "https://y/medium.jpg", fuente: "https://inat/2" },
    ]);
  });

  it("respeta el máximo y salta observaciones sin foto", () => {
    const obs: INatObservation[] = [
      { id: 1, photos: [] },
      { id: 2, photos: [{ id: 20, url: "https://y/square.jpg" }] },
      { id: 3, photos: [{ id: 30, url: "https://z/square.jpg" }] },
    ];
    const out = urlsDeFotos(obs, 1);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(2);
  });

  it("construye fuente por defecto si falta uri", () => {
    const obs: INatObservation[] = [{ id: 7, photos: [{ id: 1, url: "https://a/square.jpg" }] }];
    expect(urlsDeFotos(obs, 5)[0].fuente).toBe("https://www.inaturalist.org/observations/7");
  });
});

describe("llamadas a la API (fetch mockeado)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("buscarTaxonId devuelve el id del primer resultado", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ results: [{ id: 12345 }] }),
    });
    expect(await buscarTaxonId("Lithraea caustica")).toBe(12345);
  });

  it("buscarTaxonId devuelve null si no hay resultados", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ json: async () => ({ results: [] }) });
    expect(await buscarTaxonId("Inexistente")).toBeNull();
  });

  it("obtenerObservaciones devuelve el arreglo de resultados", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ results: [{ id: 1, photos: [] }] }),
    });
    const obs = await obtenerObservaciones(12345, 5);
    expect(obs).toHaveLength(1);
    expect(obs[0].id).toBe(1);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- inaturalist`
Expected: FAIL — "Cannot find module '../inaturalist'".

- [ ] **Step 3: Implementar `inaturalist.ts`**

Crear `scripts/eval/inaturalist.ts`:

```typescript
const API = "https://api.inaturalist.org/v1";

export interface INatObservation {
  id: number;
  uri?: string;
  photos: { id: number; url: string }[];
}

export async function buscarTaxonId(nombreCientifico: string): Promise<number | null> {
  const url = `${API}/taxa?q=${encodeURIComponent(nombreCientifico)}&rank=species,genus&per_page=1`;
  const res = await fetch(url);
  const json = (await res.json()) as { results?: { id: number }[] };
  const first = json.results?.[0];
  return first ? first.id : null;
}

export async function obtenerObservaciones(
  taxonId: number,
  perPage: number,
): Promise<INatObservation[]> {
  const url =
    `${API}/observations?taxon_id=${taxonId}&quality_grade=research` +
    `&photos=true&per_page=${perPage}&order_by=votes&order=desc`;
  const res = await fetch(url);
  const json = (await res.json()) as { results?: INatObservation[] };
  return json.results ?? [];
}

export function urlsDeFotos(
  observaciones: INatObservation[],
  max: number,
): { id: number; url: string; fuente: string }[] {
  const out: { id: number; url: string; fuente: string }[] = [];
  for (const obs of observaciones) {
    const foto = obs.photos?.[0];
    if (!foto) continue;
    out.push({
      id: obs.id,
      url: foto.url.replace("/square.", "/medium.").replace("/thumb.", "/medium."),
      fuente: obs.uri ?? `https://www.inaturalist.org/observations/${obs.id}`,
    });
    if (out.length >= max) break;
  }
  return out;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- inaturalist`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/eval/inaturalist.ts scripts/eval/__tests__/inaturalist.test.ts
git commit -m "feat: cliente de iNaturalist para el banco de evaluacion"
```

---

## Task 4: Config de especies y script de descarga del dataset

**Files:**
- Create: `scripts/eval/species.config.ts`
- Create: `scripts/eval/fetch-dataset.ts`
- Modify: `package.json` (devDep `tsx` + script `eval:fetch`)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `buscarTaxonId`, `obtenerObservaciones`, `urlsDeFotos` de `./inaturalist`; `Manifest`, `ManifestItem` de `@/lib/evalTypes`; `Host` de `@/lib/types`.
- Produces: `interface EspecieEval { slug: Host; nombreCientifico: string; fotos: number }`; `ESPECIES_EVAL: EspecieEval[]`; archivo `eval/dataset/manifest.json` y fotos en `eval/dataset/<slug>/`.

- [ ] **Step 1: Agregar `tsx` y los scripts a `package.json`**

En `package.json`, dentro de `"scripts"` agregar:

```json
    "eval:fetch": "tsx scripts/eval/fetch-dataset.ts",
    "eval:run": "tsx scripts/eval/run-eval.ts"
```

Instalar el runner:

```bash
npm install --save-dev tsx
```

Expected: `tsx` aparece en `devDependencies` de `package.json`.

- [ ] **Step 2: Ignorar el dataset en git**

Añadir al final de `.gitignore`:

```
# Banco de evaluación: imágenes descargadas (no son código del proyecto)
eval/dataset/
```

- [ ] **Step 3: Crear la config de especies**

Crear `scripts/eval/species.config.ts`:

```typescript
import type { Host } from "@/lib/types";

export interface EspecieEval {
  slug: Host;
  nombreCientifico: string;
  fotos: number;
}

// Set inicial: ~10 hospederos comunes con buena cobertura en iNaturalist.
// Crece agregando filas (hacia los 31 Host) sin tocar el código de los scripts.
export const ESPECIES_EVAL: EspecieEval[] = [
  { slug: "quillay", nombreCientifico: "Quillaja saponaria", fotos: 5 },
  { slug: "litre", nombreCientifico: "Lithraea caustica", fotos: 5 },
  { slug: "peumo", nombreCientifico: "Cryptocarya alba", fotos: 5 },
  { slug: "boldo", nombreCientifico: "Peumus boldus", fotos: 5 },
  { slug: "maiten", nombreCientifico: "Maytenus boaria", fotos: 5 },
  { slug: "aromo", nombreCientifico: "Acacia dealbata", fotos: 5 },
  { slug: "maqui", nombreCientifico: "Aristotelia chilensis", fotos: 5 },
  { slug: "huingan", nombreCientifico: "Schinus polygamus", fotos: 5 },
  { slug: "sauce", nombreCientifico: "Salix", fotos: 5 },
  { slug: "olivo", nombreCientifico: "Olea europaea", fotos: 5 },
];
```

- [ ] **Step 4: Implementar el script de descarga**

Crear `scripts/eval/fetch-dataset.ts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import { ESPECIES_EVAL } from "./species.config";
import { buscarTaxonId, obtenerObservaciones, urlsDeFotos } from "./inaturalist";
import type { Manifest, ManifestItem } from "@/lib/evalTypes";

const DATASET_DIR = path.resolve(process.cwd(), "eval/dataset");

async function descargar(url: string, destino: string): Promise<void> {
  if (fs.existsSync(destino)) return; // cache: no rebajar si ya existe
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destino, buf);
}

async function main(): Promise<void> {
  const items: ManifestItem[] = [];

  for (const especie of ESPECIES_EVAL) {
    const taxonId = await buscarTaxonId(especie.nombreCientifico);
    if (taxonId === null) {
      console.warn(`⚠️  Sin taxón para ${especie.nombreCientifico} (${especie.slug}), se omite`);
      continue;
    }
    // pedimos el doble por si algunas observaciones no traen foto utilizable
    const observaciones = await obtenerObservaciones(taxonId, especie.fotos * 2);
    const fotos = urlsDeFotos(observaciones, especie.fotos);

    const carpeta = path.join(DATASET_DIR, especie.slug);
    fs.mkdirSync(carpeta, { recursive: true });

    for (const foto of fotos) {
      const archivoRel = `${especie.slug}/${foto.id}.jpg`;
      await descargar(foto.url, path.join(DATASET_DIR, archivoRel));
      items.push({ archivo: archivoRel, hospedero: especie.slug, fuente: foto.fuente });
    }
    console.log(`✓ ${especie.slug}: ${fotos.length} fotos`);
  }

  fs.mkdirSync(DATASET_DIR, { recursive: true });
  const manifest: Manifest = { generadoEl: new Date().toISOString(), items };
  fs.writeFileSync(
    path.join(DATASET_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`\nManifiesto escrito: ${items.length} imágenes en total`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 5: Correr el script contra iNaturalist (prueba de humo)**

Run: `npm run eval:fetch`
Expected: imprime una línea `✓ <slug>: N fotos` por especie y al final `Manifiesto escrito: ~50 imágenes en total`. Se crea `eval/dataset/manifest.json` y carpetas con `.jpg`. (Requiere internet; no requiere API key.)

- [ ] **Step 6: Verificar que el dataset está ignorado por git**

Run: `git status --porcelain eval/dataset`
Expected: SIN salida (el dataset está ignorado). `git status` sí debe mostrar `package.json`, `.gitignore` y los archivos nuevos de `scripts/eval/`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/eval/species.config.ts scripts/eval/fetch-dataset.ts
git commit -m "feat: script de descarga del dataset de evaluacion desde iNaturalist"
```

---

## Task 5: Bucle de evaluación

**Files:**
- Create: `scripts/eval/evaluate.ts`
- Create: `scripts/eval/__tests__/evaluate.test.ts`

**Interfaces:**
- Consumes: `calcularMetricas` de `./metrics`; `ManifestItem`, `EvalResult` de `@/lib/evalTypes`; `IdentifyResult` de `@/lib/types`.
- Produces:
  - `type IdentificarItem = (item: ManifestItem) => Promise<IdentifyResult>`
  - `evaluarManifiesto(items: ManifestItem[], identificar: IdentificarItem): Promise<EvalResult>`

- [ ] **Step 1: Escribir el test que falla**

Crear `scripts/eval/__tests__/evaluate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { evaluarManifiesto } from "../evaluate";
import type { ManifestItem } from "@/lib/evalTypes";
import type { IdentifyResult } from "@/lib/types";

const items: ManifestItem[] = [
  { archivo: "litre/1.jpg", hospedero: "litre", fuente: "x" },
  { archivo: "boldo/1.jpg", hospedero: "boldo", fuente: "y" },
];

// identificador falso: acierta litre en top1, falla boldo
const fake = async (item: ManifestItem): Promise<IdentifyResult> => {
  if (item.hospedero === "litre") {
    return {
      esQuintral: true,
      opciones: [
        { hospedero: "litre", confianza: 0.8 },
        { hospedero: "peumo", confianza: 0.2 },
      ],
      fenologia: "",
      notas: "",
    };
  }
  return {
    esQuintral: true,
    opciones: [
      { hospedero: "peumo", confianza: 0.6 },
      { hospedero: "quillay", confianza: 0.3 },
    ],
    fenologia: "",
    notas: "",
  };
};

describe("evaluarManifiesto", () => {
  it("aplica el identificador a cada item y agrega métricas", async () => {
    const r = await evaluarManifiesto(items, fake);
    expect(r.totalImagenes).toBe(2);
    expect(r.aciertoTop1).toBeCloseTo(0.5);
    expect(r.predicciones[0]).toMatchObject({
      archivo: "litre/1.jpg",
      verdadero: "litre",
      top1: "litre",
      top2: "peumo",
      conf1: 0.8,
      conf2: 0.2,
    });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- evaluate`
Expected: FAIL — "Cannot find module '../evaluate'".

- [ ] **Step 3: Implementar `evaluate.ts`**

Crear `scripts/eval/evaluate.ts`:

```typescript
import { calcularMetricas } from "./metrics";
import type { ManifestItem, EvalResult, Prediccion } from "@/lib/evalTypes";
import type { IdentifyResult } from "@/lib/types";

export type IdentificarItem = (item: ManifestItem) => Promise<IdentifyResult>;

export async function evaluarManifiesto(
  items: ManifestItem[],
  identificar: IdentificarItem,
): Promise<EvalResult> {
  const predicciones: Prediccion[] = [];
  for (const item of items) {
    const r = await identificar(item);
    predicciones.push({
      archivo: item.archivo,
      verdadero: item.hospedero,
      top1: r.opciones[0].hospedero,
      top2: r.opciones[1].hospedero,
      conf1: r.opciones[0].confianza,
      conf2: r.opciones[1].confianza,
    });
  }
  return calcularMetricas(predicciones, new Date().toISOString());
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- evaluate`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add scripts/eval/evaluate.ts scripts/eval/__tests__/evaluate.test.ts
git commit -m "feat: bucle de evaluacion del manifiesto con identificador inyectable"
```

---

## Task 6: Script `run-eval` (CLI de medición)

**Files:**
- Create: `scripts/eval/run-eval.ts`

**Interfaces:**
- Consumes: `evaluarManifiesto` de `./evaluate`; `identificarHospedero`, `AllowedMediaType` de `@/lib/identifyClient`; `Manifest` de `@/lib/evalTypes`.
- Produces: archivo `eval/results/<YYYY-MM-DD-HHmm>.json` (`EvalResult`).

- [ ] **Step 1: Implementar `run-eval.ts`**

Crear `scripts/eval/run-eval.ts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import { evaluarManifiesto } from "./evaluate";
import { identificarHospedero, type AllowedMediaType } from "@/lib/identifyClient";
import type { Manifest, ManifestItem } from "@/lib/evalTypes";

const DATASET_DIR = path.resolve(process.cwd(), "eval/dataset");
const RESULTS_DIR = path.resolve(process.cwd(), "eval/results");

function mediaTypePorExtension(archivo: string): AllowedMediaType {
  const ext = path.extname(archivo).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

async function identificarItem(item: ManifestItem) {
  const ruta = path.join(DATASET_DIR, item.archivo);
  const base64 = fs.readFileSync(ruta).toString("base64");
  return identificarHospedero(base64, mediaTypePorExtension(item.archivo));
}

function selloDeTiempo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function main(): Promise<void> {
  const manifestPath = path.join(DATASET_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("No existe eval/dataset/manifest.json. Corre primero: npm run eval:fetch");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Manifest;

  const resultado = await evaluarManifiesto(manifest.items, identificarItem);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const salida = path.join(RESULTS_DIR, `${selloDeTiempo()}.json`);
  fs.writeFileSync(salida, JSON.stringify(resultado, null, 2));

  console.log(`\nImágenes evaluadas: ${resultado.totalImagenes}`);
  console.log(`Acierto top-1: ${(resultado.aciertoTop1 * 100).toFixed(1)}%`);
  console.log(`Acierto top-2: ${(resultado.aciertoTop2 * 100).toFixed(1)}%`);
  console.log("\nPor especie:");
  for (const e of resultado.porEspecie) {
    console.log(
      `  ${e.hospedero.padEnd(10)} n=${e.n}  top1=${(e.aciertoTop1 * 100).toFixed(0)}%  top2=${(e.aciertoTop2 * 100).toFixed(0)}%`,
    );
  }
  console.log(`\nResultado escrito en ${salida}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Correr la evaluación (prueba de humo)**

Requiere `ANTHROPIC_API_KEY` en el entorno y haber corrido `npm run eval:fetch` antes.

Run: `npm run eval:run`
Expected: imprime "Acierto top-1: XX.X%", "Acierto top-2: XX.X%", el desglose por especie, y "Resultado escrito en eval/results/<fecha>.json". El archivo JSON existe y es un `EvalResult` válido.

- [ ] **Step 3: Commit**

```bash
git add scripts/eval/run-eval.ts
git commit -m "feat: script run-eval que mide el identificador y escribe resultados"
```

---

## Task 7: Página de resultados `/evaluacion`

**Files:**
- Create: `src/app/evaluacion/page.tsx`

**Interfaces:**
- Consumes: `EvalResult` de `@/lib/evalTypes`; `etiquetaHospedero` de `@/lib/hosts`; lee `eval/results/*.json` del filesystem.
- Produces: ruta `/evaluacion`.

- [ ] **Step 1: Implementar la página (server component)**

Crear `src/app/evaluacion/page.tsx`:

```tsx
import fs from "node:fs";
import path from "node:path";
import type { EvalResult } from "@/lib/evalTypes";
import { etiquetaHospedero } from "@/lib/hosts";

export const dynamic = "force-dynamic";

function ultimoResultado(): EvalResult | null {
  const dir = path.resolve(process.cwd(), "eval/results");
  if (!fs.existsSync(dir)) return null;
  const archivos = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (archivos.length === 0) return null;
  const ultimo = archivos[archivos.length - 1];
  return JSON.parse(fs.readFileSync(path.join(dir, ultimo), "utf-8")) as EvalResult;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export default function EvaluacionPage() {
  const r = ultimoResultado();

  if (!r) {
    return (
      <main className="section">
        <h1>Evaluación del identificador</h1>
        <p>
          Aún no hay resultados. Corre <code>npm run eval:fetch</code> y luego{" "}
          <code>npm run eval:run</code> para generarlos.
        </p>
      </main>
    );
  }

  return (
    <main className="section">
      <h1>Evaluación del identificador</h1>
      <p>
        {r.totalImagenes} imágenes de iNaturalist · generado el{" "}
        {new Date(r.generadoEl).toLocaleString("es-CL")}
      </p>

      <p style={{ fontStyle: "italic", opacity: 0.8 }}>
        Sesgo conocido: las fotos de iNaturalist suelen ser primeros planos de hoja o
        corteza, no el árbol completo con quintral a distancia. El porcentaje real en uso
        de la app puede ser algo menor. La métrica sirve para comparar versiones bajo la
        misma vara.
      </p>

      <div style={{ display: "flex", gap: "2rem", margin: "1.5rem 0" }}>
        <div>
          <strong>Acierto top-1</strong>
          <div className="meter" role="meter" aria-valuenow={Math.round(r.aciertoTop1 * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ transform: `scaleX(${r.aciertoTop1})` }} />
          </div>
          <span>{pct(r.aciertoTop1)}</span>
        </div>
        <div>
          <strong>Acierto top-2</strong>
          <div className="meter" role="meter" aria-valuenow={Math.round(r.aciertoTop2 * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ transform: `scaleX(${r.aciertoTop2})` }} />
          </div>
          <span>{pct(r.aciertoTop2)}</span>
        </div>
      </div>

      <h2>Por especie</h2>
      <table>
        <thead>
          <tr>
            <th>Hospedero</th>
            <th>n</th>
            <th>Top-1</th>
            <th>Top-2</th>
          </tr>
        </thead>
        <tbody>
          {r.porEspecie.map((e) => (
            <tr key={e.hospedero}>
              <td>{etiquetaHospedero(e.hospedero)}</td>
              <td>{e.n}</td>
              <td>{pct(e.aciertoTop1)}</td>
              <td>{pct(e.aciertoTop2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {r.confusiones.length > 0 && (
        <>
          <h2>Confusiones más frecuentes</h2>
          <ul>
            {r.confusiones.slice(0, 10).map((c) => (
              <li key={`${c.verdadero}->${c.predicho}`}>
                {etiquetaHospedero(c.verdadero)} → {etiquetaHospedero(c.predicho)} (×{c.veces})
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verificar que compila y la ruta carga**

Run: `npm run build`
Expected: build sin errores de tipos; la ruta `/evaluacion` aparece en la salida de rutas de Next.

- [ ] **Step 3: Verificación manual (opcional, requiere resultados)**

Run: `npm run dev` y abrir `http://localhost:3000/evaluacion`
Expected: si hay un JSON en `eval/results/`, muestra las barras top-1/top-2, la tabla por especie y las confusiones. Si no, muestra el mensaje de "Aún no hay resultados".

- [ ] **Step 4: Commit**

```bash
git add src/app/evaluacion/page.tsx
git commit -m "feat: pagina /evaluacion con metricas del identificador"
```

---

## Self-Review (cobertura del spec)

- **Recolector (iNaturalist + manifiesto):** Tasks 3 y 4. ✓
- **Refactor `identifyClient`:** Task 1. ✓
- **Evaluador + métricas:** Tasks 2 (métricas), 5 (bucle), 6 (CLI). ✓
- **Página `/evaluacion`:** Task 7. ✓
- **Config de especies editable (~10 × 5):** Task 4, `species.config.ts`. ✓
- **Métricas: top-1, top-2, por especie, confusiones, confianza acierto/error:** Task 2. ✓
- **Sesgo conocido documentado en la página:** Task 7. ✓
- **`eval/dataset/` ignorado; resultados commiteables:** Task 4 (`.gitignore`). ✓
- **Mismo código que la app (medición honesta):** Task 1 + Task 6 (usa `identificarHospedero`). ✓
- **Scripts `eval:fetch` / `eval:run`:** Task 4. ✓
