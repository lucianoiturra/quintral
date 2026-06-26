# Segunda opinión con Pl@ntNet (Sub-proyecto D) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ofrecer una segunda opinión a demanda con Pl@ntNet, mostrada lado a lado con una bandera de acuerdo, y medir su acierto sobre el banco.

**Architecture:** Un mapa `Host`↔nombre científico traduce los resultados de Pl@ntNet a nuestros slugs. Un cliente servidor (`plantnet.ts`) consulta la API de Pl@ntNet y agrega por host. Una ruta `/api/verify` la expone; la UI agrega un botón "Verificar". Una función pura `concuerdan()` decide la bandera. Un script `eval:plantnet` mide a Pl@ntNet sobre el mismo manifiesto que A.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest, `tsx`, API de Pl@ntNet (`FormData`/`Blob` nativos de Node 18+).

## Global Constraints

- **Depende de A, B y C**: deben existir `src/lib/imagenes.ts` (`ImagenEntrada`), `src/lib/identifyClient.ts` (`ALLOWED_MEDIA_TYPES`, `AllowedMediaType`), `src/lib/types.ts` (`Host`, `IdentifyResult`), `scripts/eval/{evaluate,metrics}.ts` y el banco (`manifest.json`).
- Tests con **Vitest** (`npm test`), en `__tests__` junto al código. Alias `@/*` → `./src/*`. Scripts con `tsx`.
- **API externa**: Pl@ntNet, endpoint `POST https://my-api.plantnet.org/v2/identify/all?api-key=<key>`. La key se lee de `process.env.PLANTNET_API_KEY` (servidor). Sin key, `/api/verify` responde 503 y la UI lo informa sin romper la identificación.
- Mapeo de órganos `EtiquetaFoto → Pl@ntNet`: `corteza→bark`, `hoja→leaf`, `arbol→habit`, `fruto→fruit`, sin etiqueta → `auto`.
- Tope de **4 imágenes** por verificación (igual que `/api/identify`).
- Idioma del código y UI: español.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/nombresCientificos.ts` | **Nuevo.** Mapa `Host`↔nombre científico + `hostDeNombreCientifico`. |
| `src/lib/plantnet.ts` | **Nuevo.** `consultarPlantNet` (servidor). |
| `src/lib/acuerdo.ts` | **Nuevo.** `concuerdan()` (pura). |
| `src/app/api/verify/route.ts` | **Nuevo.** `POST /api/verify`. |
| `src/components/IdentifySection.tsx` | **Modificar.** Botón "Verificar"; bloque lado a lado. |
| `scripts/eval/run-plantnet.ts` | **Nuevo.** `eval:plantnet`. |
| `package.json` | **Modificar.** Script `eval:plantnet`. |

---

## Task 1: Mapa de nombres científicos

**Files:**
- Create: `src/lib/nombresCientificos.ts`
- Create: `src/lib/__tests__/nombresCientificos.test.ts`

**Interfaces:**
- Consumes: `Host`, `HOSPEDEROS` de `@/lib/types` y `@/lib/hosts`.
- Produces:
  - `NOMBRES_CIENTIFICOS: Record<Host, string[]>`
  - `hostDeNombreCientifico(nombre: string): Host | null`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/__tests__/nombresCientificos.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { NOMBRES_CIENTIFICOS, hostDeNombreCientifico } from "@/lib/nombresCientificos";
import { HOSPEDEROS } from "@/lib/hosts";

describe("NOMBRES_CIENTIFICOS", () => {
  it("tiene una entrada por cada Host", () => {
    for (const h of HOSPEDEROS) {
      expect(NOMBRES_CIENTIFICOS[h]).toBeDefined();
    }
  });
});

describe("hostDeNombreCientifico", () => {
  it("coincidencia exacta de especie", () => {
    expect(hostDeNombreCientifico("Quillaja saponaria")).toBe("quillay");
  });
  it("ignora el autor y mayúsculas", () => {
    expect(hostDeNombreCientifico("LITHRAEA CAUSTICA (Molina) Hook. & Arn.")).toBe("litre");
  });
  it("coincide por género cuando la especie difiere", () => {
    // Salix es género; cualquier Salix → sauce
    expect(hostDeNombreCientifico("Salix babylonica")).toBe("sauce");
  });
  it("devuelve null para una planta no hospedera (el quintral)", () => {
    expect(hostDeNombreCientifico("Tristerix corymbosus")).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- nombresCientificos`
Expected: FAIL — "Cannot find module '@/lib/nombresCientificos'".

- [ ] **Step 3: Implementar `nombresCientificos.ts`**

Crear `src/lib/nombresCientificos.ts`:

```typescript
import type { Host } from "@/lib/types";

// Nombre(s) científico(s) por hospedero. La primera palabra (género) habilita el
// respaldo por género en hostDeNombreCientifico. "otro" no tiene nombre.
export const NOMBRES_CIENTIFICOS: Record<Host, string[]> = {
  alamo: ["Populus nigra", "Populus alba"],
  aromo: ["Acacia dealbata"],
  arrayan: ["Luma apiculata"],
  barraco: ["Eucryphia cordifolia"],
  boldo: ["Peumus boldus"],
  chacay: ["Discaria chacaye"],
  coihue: ["Nothofagus dombeyi"],
  colliguay: ["Colliguaja odorifera"],
  corcolen: ["Azara dentata"],
  crucero: ["Colletia hystrix", "Colletia spinosissima"],
  "eulychnia-breviflora": ["Eulychnia breviflora"],
  "eulychnia-castanea": ["Eulychnia castanea"],
  huingan: ["Schinus polygamus", "Schinus polygama"],
  litre: ["Lithraea caustica"],
  maqui: ["Aristotelia chilensis"],
  maiten: ["Maytenus boaria"],
  manzano: ["Malus domestica", "Malus pumila"],
  "nothofagus-nitida": ["Nothofagus nitida"],
  olivo: ["Olea europaea"],
  peral: ["Pyrus communis"],
  peumo: ["Cryptocarya alba"],
  "pingo-pingo": ["Ephedra chilensis", "Ephedra americana"],
  "platano-oriental": ["Platanus orientalis"],
  quillay: ["Quillaja saponaria"],
  quisco: ["Echinopsis chiloensis", "Trichocereus chiloensis"],
  "quisco-coquimbano": ["Eulychnia acida"],
  "quisco-litoralis": ["Echinopsis litoralis", "Trichocereus litoralis"],
  "quisco-skottsbergii": ["Echinopsis skottsbergii", "Trichocereus skottsbergii"],
  quisquito: ["Eriosyce", "Neoporteria"],
  sauce: ["Salix"],
  otro: [],
};

function normalizar(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\s+/g, " ");
}

// Construido una vez: especie completa → host, y género → host (para respaldo).
const PORESPECIE = new Map<string, Host>();
const PORGENERO = new Map<string, Host>();
for (const [host, nombres] of Object.entries(NOMBRES_CIENTIFICOS) as [Host, string[]][]) {
  for (const n of nombres) {
    const norm = normalizar(n);
    const partes = norm.split(" ");
    if (partes.length >= 2) PORESPECIE.set(norm, host);
    if (!PORGENERO.has(partes[0])) PORGENERO.set(partes[0], host);
  }
}

export function hostDeNombreCientifico(nombre: string): Host | null {
  const norm = normalizar(nombre);
  const partes = norm.split(" ");
  // 1) intento por especie "género especie" (ignora autor: toma las 2 primeras palabras)
  if (partes.length >= 2) {
    const especie = `${partes[0]} ${partes[1]}`;
    const porEspecie = PORESPECIE.get(especie);
    if (porEspecie) return porEspecie;
  }
  // 2) respaldo por género
  return PORGENERO.get(partes[0]) ?? null;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- nombresCientificos`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nombresCientificos.ts src/lib/__tests__/nombresCientificos.test.ts
git commit -m "feat: mapa Host<->nombre cientifico con respaldo por genero"
```

---

## Task 2: Cliente de Pl@ntNet

**Files:**
- Create: `src/lib/plantnet.ts`
- Create: `src/lib/__tests__/plantnet.test.ts`

**Interfaces:**
- Consumes: `ImagenEntrada` de `@/lib/imagenes`; `hostDeNombreCientifico` de `@/lib/nombresCientificos`; `Host` de `@/lib/types`.
- Produces:
  - `interface CandidatoPlantNet { host: Host; score: number }`
  - `consultarPlantNet(imagenes: ImagenEntrada[], apiKey: string): Promise<{ candidatos: CandidatoPlantNet[] }>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/__tests__/plantnet.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consultarPlantNet } from "@/lib/plantnet";

describe("consultarPlantNet", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("mapea resultados a hosts, descarta no mapeables y agrega por host", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { score: 0.6, species: { scientificNameWithoutAuthor: "Quillaja saponaria" } },
          { score: 0.3, species: { scientificNameWithoutAuthor: "Tristerix corymbosus" } }, // no mapea
          { score: 0.1, species: { scientificNameWithoutAuthor: "Lithraea caustica" } },
        ],
      }),
    });
    const { candidatos } = await consultarPlantNet(
      [{ base64: "AAAA", mediaType: "image/jpeg", etiqueta: "hoja" }],
      "key",
    );
    expect(candidatos.map((c) => c.host)).toEqual(["quillay", "litre"]);
    // scores normalizados sobre el total mapeado (0.6 + 0.1 = 0.7)
    expect(candidatos[0].score).toBeCloseTo(0.6 / 0.7);
  });

  it("sin resultados mapeables devuelve lista vacía", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ score: 0.9, species: { scientificNameWithoutAuthor: "Tristerix corymbosus" } }] }),
    });
    const { candidatos } = await consultarPlantNet([{ base64: "A", mediaType: "image/jpeg" }], "key");
    expect(candidatos).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- plantnet`
Expected: FAIL — "Cannot find module '@/lib/plantnet'".

- [ ] **Step 3: Implementar `plantnet.ts`**

Crear `src/lib/plantnet.ts`:

```typescript
import type { Host } from "@/lib/types";
import type { ImagenEntrada, EtiquetaFoto } from "@/lib/imagenes";
import { hostDeNombreCientifico } from "@/lib/nombresCientificos";

export interface CandidatoPlantNet {
  host: Host;
  score: number;
}

const ORGANO: Record<EtiquetaFoto, string> = {
  corteza: "bark",
  hoja: "leaf",
  arbol: "habit",
  fruto: "fruit",
};

const MAX_CANDIDATOS = 3;

function base64ABlob(base64: string, mediaType: string): Blob {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: mediaType });
}

interface PlantNetResult {
  score: number;
  species: { scientificNameWithoutAuthor: string };
}

export async function consultarPlantNet(
  imagenes: ImagenEntrada[],
  apiKey: string,
): Promise<{ candidatos: CandidatoPlantNet[] }> {
  const form = new FormData();
  for (const img of imagenes) {
    form.append("images", base64ABlob(img.base64, img.mediaType), "foto.jpg");
    form.append("organs", img.etiqueta ? ORGANO[img.etiqueta] : "auto");
  }

  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: "POST", body: form });
  const json = (await res.json()) as { results?: PlantNetResult[] };

  const porHost = new Map<Host, number>();
  for (const r of json.results ?? []) {
    const host = hostDeNombreCientifico(r.species.scientificNameWithoutAuthor);
    if (!host) continue;
    porHost.set(host, (porHost.get(host) ?? 0) + r.score);
  }

  const total = Array.from(porHost.values()).reduce((a, b) => a + b, 0);
  const candidatos: CandidatoPlantNet[] = Array.from(porHost.entries())
    .map(([host, suma]) => ({ host, score: total > 0 ? suma / total : 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATOS);

  return { candidatos };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- plantnet`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/plantnet.ts src/lib/__tests__/plantnet.test.ts
git commit -m "feat: cliente de Pl@ntNet con mapeo y agregacion por host"
```

---

## Task 3: Función de acuerdo

**Files:**
- Create: `src/lib/acuerdo.ts`
- Create: `src/lib/__tests__/acuerdo.test.ts`

**Interfaces:**
- Consumes: `IdentifyResult` de `@/lib/types`; `CandidatoPlantNet` de `@/lib/plantnet`.
- Produces: `concuerdan(claude: IdentifyResult, candidatos: CandidatoPlantNet[]): "coinciden" | "difieren" | "sin-datos"`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/__tests__/acuerdo.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { concuerdan } from "@/lib/acuerdo";
import type { IdentifyResult } from "@/lib/types";

const claude: IdentifyResult = {
  esQuintral: true,
  opciones: [
    { hospedero: "quillay", confianza: 0.8 },
    { hospedero: "litre", confianza: 0.3 },
  ],
  fenologia: "",
  notas: "",
};

describe("concuerdan", () => {
  it("coinciden si el top de Pl@ntNet está entre las 2 de Claude", () => {
    expect(concuerdan(claude, [{ host: "litre", score: 0.9 }])).toBe("coinciden");
  });
  it("difieren si el top de Pl@ntNet no está", () => {
    expect(concuerdan(claude, [{ host: "boldo", score: 0.9 }])).toBe("difieren");
  });
  it("sin-datos si Pl@ntNet no devolvió candidatos", () => {
    expect(concuerdan(claude, [])).toBe("sin-datos");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- acuerdo`
Expected: FAIL — "Cannot find module '@/lib/acuerdo'".

- [ ] **Step 3: Implementar `acuerdo.ts`**

Crear `src/lib/acuerdo.ts`:

```typescript
import type { IdentifyResult } from "@/lib/types";
import type { CandidatoPlantNet } from "@/lib/plantnet";

export function concuerdan(
  claude: IdentifyResult,
  candidatos: CandidatoPlantNet[],
): "coinciden" | "difieren" | "sin-datos" {
  if (candidatos.length === 0) return "sin-datos";
  const topPlantNet = candidatos[0].host;
  const opcionesClaude = claude.opciones.map((o) => o.hospedero);
  return opcionesClaude.includes(topPlantNet) ? "coinciden" : "difieren";
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- acuerdo`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/acuerdo.ts src/lib/__tests__/acuerdo.test.ts
git commit -m "feat: funcion concuerdan para la bandera de acuerdo"
```

---

## Task 4: Ruta `/api/verify`

**Files:**
- Create: `src/app/api/verify/route.ts`
- Create: `src/app/api/verify/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `consultarPlantNet` de `@/lib/plantnet`; `ALLOWED_MEDIA_TYPES`, `AllowedMediaType` de `@/lib/identifyClient`; `ImagenEntrada` de `@/lib/imagenes`.
- Produces: `POST /api/verify` body `{ imagenes: ImagenEntrada[] }` → `{ candidatos }` | error.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/api/verify/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const consultarMock = vi.fn();
vi.mock("@/lib/plantnet", () => ({
  consultarPlantNet: (...args: unknown[]) => consultarMock(...args),
}));

import { POST } from "@/app/api/verify/route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/verify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/verify", () => {
  beforeEach(() => {
    consultarMock.mockReset();
    process.env.PLANTNET_API_KEY = "key";
  });

  it("devuelve los candidatos de Pl@ntNet", async () => {
    consultarMock.mockResolvedValue({ candidatos: [{ host: "quillay", score: 0.9 }] });
    const res = await POST(req({ imagenes: [{ base64: "A", mediaType: "image/jpeg" }] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.candidatos[0].host).toBe("quillay");
  });

  it("503 si no hay PLANTNET_API_KEY", async () => {
    delete process.env.PLANTNET_API_KEY;
    const res = await POST(req({ imagenes: [{ base64: "A", mediaType: "image/jpeg" }] }));
    expect(res.status).toBe(503);
  });

  it("400 si no hay imágenes", async () => {
    const res = await POST(req({ imagenes: [] }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- verify`
Expected: FAIL — "Cannot find module '@/app/api/verify/route'".

- [ ] **Step 3: Implementar `route.ts`**

Crear `src/app/api/verify/route.ts`:

```typescript
import { consultarPlantNet } from "@/lib/plantnet";
import { ALLOWED_MEDIA_TYPES, type AllowedMediaType } from "@/lib/identifyClient";
import type { ImagenEntrada } from "@/lib/imagenes";

export const runtime = "nodejs";

const MAX_IMAGENES = 4;

export async function POST(request: Request): Promise<Response> {
  let body: { imagenes?: ImagenEntrada[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const imagenes = Array.isArray(body.imagenes) ? body.imagenes.slice(0, MAX_IMAGENES) : [];
  if (imagenes.length === 0) {
    return Response.json({ error: "Falta la imagen" }, { status: 400 });
  }

  const tiposOk = imagenes.every((i) =>
    ALLOWED_MEDIA_TYPES.includes(i.mediaType as AllowedMediaType),
  );
  if (!tiposOk) {
    return Response.json({ error: "mediaType no soportado" }, { status: 400 });
  }

  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Verificación no disponible" }, { status: 503 });
  }

  try {
    const { candidatos } = await consultarPlantNet(imagenes, apiKey);
    return Response.json({ candidatos });
  } catch {
    return Response.json({ error: "Pl@ntNet no respondió" }, { status: 502 });
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- verify`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/verify/route.ts src/app/api/verify/__tests__/route.test.ts
git commit -m "feat: ruta /api/verify para segunda opinion Pl@ntNet"
```

---

## Task 5: Botón "Verificar" y bloque lado a lado en la UI

**Files:**
- Modify: `src/components/IdentifySection.tsx`

**Interfaces:**
- Consumes: `concuerdan` de `@/lib/acuerdo`; `CandidatoPlantNet` de `@/lib/plantnet`; `etiquetaHospedero` de `@/lib/hosts`; las `ImagenEntrada[]` que ya arma `analizar` (C).
- Produces: verificación a demanda en la UI.

> Esta tarea asume la `IdentifySection` de C, donde `analizar` ya construye `ImagenEntrada[]`.
> Para reusar esas imágenes, guárdalas en estado al analizar.

- [ ] **Step 1: Guardar las imágenes analizadas en estado**

En `IdentifySection.tsx`, agregar imports y estado:

```typescript
import { concuerdan } from "@/lib/acuerdo";
import type { CandidatoPlantNet } from "@/lib/plantnet";
```

```typescript
  const [imagenesAnalizadas, setImagenesAnalizadas] = useState<ImagenEntrada[]>([]);
  const [verificacion, setVerificacion] = useState<{ candidatos: CandidatoPlantNet[] } | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null);
```

En `analizar`, justo después de construir el arreglo `imagenes` y antes (o después) del fetch,
guardarlas y limpiar verificación previa:

```typescript
      setImagenesAnalizadas(imagenes);
      setVerificacion(null);
      setErrorVerificacion(null);
```

- [ ] **Step 2: Función `verificar`**

Agregar dentro del componente:

```typescript
  async function verificar() {
    if (imagenesAnalizadas.length === 0) return;
    setVerificando(true);
    setErrorVerificacion(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imagenes: imagenesAnalizadas }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo verificar.");
      }
      setVerificacion((await res.json()) as { candidatos: CandidatoPlantNet[] });
    } catch (err) {
      setErrorVerificacion(err instanceof Error ? err.message : "Error al verificar.");
    } finally {
      setVerificando(false);
    }
  }
```

- [ ] **Step 3: Render del botón y el bloque lado a lado**

Dentro del bloque `{resultado ? (...) : null}`, después de `result-data`, agregar:

```tsx
              <div className="verificacion">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={verificar}
                  disabled={verificando}
                >
                  {verificando ? "Verificando..." : "Verificar con Pl@ntNet"}
                </button>

                {errorVerificacion ? (
                  <p className="alert alert--error">{errorVerificacion}</p>
                ) : null}

                {verificacion ? (
                  <div className="verificacion-resultado">
                    {(() => {
                      const estado = concuerdan(resultado, verificacion.candidatos);
                      const texto =
                        estado === "coinciden"
                          ? "Coinciden ✓"
                          : estado === "difieren"
                            ? "Difieren — revisa a mano"
                            : "Pl@ntNet no reconoció un hospedero conocido";
                      return <p className={`badge badge--${estado}`}>{texto}</p>;
                    })()}
                    <p className="result-options-label">Según Pl@ntNet</p>
                    {verificacion.candidatos.map((c) => (
                      <div key={c.host} className="result-conf-head">
                        <span>{etiquetaHospedero(c.host)}</span>
                        <strong>{Math.round(c.score * 100)}%</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
```

- [ ] **Step 4: Verificar compilación y suite**

Run: `npm test`
Expected: PASS — toda la suite.

Run: `npm run build`
Expected: build sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/components/IdentifySection.tsx
git commit -m "feat: boton Verificar con Pl@ntNet y bandera de acuerdo"
```

---

## Task 6: Medición de Pl@ntNet sobre el banco

**Files:**
- Create: `scripts/eval/run-plantnet.ts`
- Modify: `package.json` (script `eval:plantnet`)

**Interfaces:**
- Consumes: `evaluarManifiesto` de `./evaluate`; `consultarPlantNet` de `@/lib/plantnet`; `Manifest`, `ManifestItem` de `@/lib/evalTypes`; `IdentifyResult` de `@/lib/types`.
- Produces: `eval/results/<fecha>-plantnet.json`.

- [ ] **Step 1: Agregar el script a `package.json`**

En `"scripts"`:

```json
    "eval:plantnet": "tsx scripts/eval/run-plantnet.ts"
```

- [ ] **Step 2: Implementar `run-plantnet.ts`**

Crear `scripts/eval/run-plantnet.ts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import { evaluarManifiesto } from "./evaluate";
import { consultarPlantNet } from "@/lib/plantnet";
import type { AllowedMediaType } from "@/lib/identifyClient";
import type { Manifest, ManifestItem } from "@/lib/evalTypes";
import type { IdentifyResult } from "@/lib/types";

const DATASET_DIR = path.resolve(process.cwd(), "eval/dataset");
const RESULTS_DIR = path.resolve(process.cwd(), "eval/results");

function mediaTypePorExtension(archivo: string): AllowedMediaType {
  const ext = path.extname(archivo).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function selloDeTiempo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function identificarItem(item: ManifestItem): Promise<IdentifyResult> {
  const base64 = fs.readFileSync(path.join(DATASET_DIR, item.archivo)).toString("base64");
  const { candidatos } = await consultarPlantNet(
    [{ base64, mediaType: mediaTypePorExtension(item.archivo) }],
    process.env.PLANTNET_API_KEY!,
  );
  const opcion = (i: number) =>
    candidatos[i]
      ? { hospedero: candidatos[i].host, confianza: candidatos[i].score }
      : { hospedero: "otro" as const, confianza: 0 };
  return { esQuintral: true, opciones: [opcion(0), opcion(1)], fenologia: "", notas: "" };
}

async function main(): Promise<void> {
  if (!process.env.PLANTNET_API_KEY) {
    console.error("Falta PLANTNET_API_KEY en el entorno.");
    process.exit(1);
  }
  const manifestPath = path.join(DATASET_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("No existe eval/dataset/manifest.json. Corre primero: npm run eval:fetch");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Manifest;

  const resultado = await evaluarManifiesto(manifest.items, identificarItem);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const salida = path.join(RESULTS_DIR, `${selloDeTiempo()}-plantnet.json`);
  fs.writeFileSync(salida, JSON.stringify(resultado, null, 2));

  console.log(`\nImágenes evaluadas (Pl@ntNet): ${resultado.totalImagenes}`);
  console.log(`Acierto top-1: ${(resultado.aciertoTop1 * 100).toFixed(1)}%`);
  console.log(`Acierto top-2: ${(resultado.aciertoTop2 * 100).toFixed(1)}%`);
  console.log(`Resultado escrito en ${salida}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Prueba de humo**

Requiere `PLANTNET_API_KEY` y `npm run eval:fetch`.

Run: `npm run eval:plantnet`
Expected: imprime acierto top-1/top-2 de Pl@ntNet y escribe `eval/results/<fecha>-plantnet.json`.
Comparar con `<fecha>-conzona.json` (Claude) para ver cuál acierta más y dónde se complementan.

- [ ] **Step 4: Commit**

```bash
git add scripts/eval/run-plantnet.ts package.json
git commit -m "feat: eval:plantnet mide a Pl@ntNet sobre el banco"
```

---

## Task 7: Documentar `PLANTNET_API_KEY` en el README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Agregar la variable de entorno al README**

En la sección de variables de entorno del `README.md` (junto a `ANTHROPIC_API_KEY`), agregar:

```markdown
- `PLANTNET_API_KEY` — clave gratuita de Pl@ntNet (https://my.plantnet.org/) para la
  verificación de segunda opinión (`/api/verify` y `npm run eval:plantnet`). Si falta, la
  verificación se desactiva sin afectar la identificación principal.
```

> Si el README no tiene una sección de variables de entorno, créala con `ANTHROPIC_API_KEY` y
> `PLANTNET_API_KEY`.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: documentar PLANTNET_API_KEY"
```

---

## Self-Review (cobertura del spec)

- **`NOMBRES_CIENTIFICOS` + `hostDeNombreCientifico` (especie/género/null):** Task 1. ✓
- **`consultarPlantNet` (multipart, organs, mapeo, agregación, normalización, tope 3):** Task 2. ✓
- **`concuerdan` (coinciden/difieren/sin-datos):** Task 3. ✓
- **`/api/verify` (valida, 503 sin key, 502 error, 400 vacío):** Task 4. ✓
- **UI: botón "Verificar", bloque lado a lado, bandera:** Task 5. ✓
- **`eval:plantnet` sobre el manifiesto, mismas métricas:** Task 6. ✓
- **`PLANTNET_API_KEY` documentada:** Task 7. ✓
- **`species.config.ts` deriva nombre de `NOMBRES_CIENTIFICOS`:** ver nota abajo.

### Notas de consistencia

- `CandidatoPlantNet = { host: Host; score: number }` idéntico en Tasks 2, 3, 5, 6.
- `consultarPlantNet(imagenes: ImagenEntrada[], apiKey: string)` idéntica en Tasks 2, 4, 6.
- La firma de mock en el test de la ruta (Task 4) coincide con la exportación real (Task 2).
- **Ajuste opcional pendiente del spec** (no bloquea D): hacer que `scripts/eval/species.config.ts`
  derive su `nombreCientifico` desde `NOMBRES_CIENTIFICOS[slug][0]` para no duplicar. Es una
  mejora menor de DRY; se puede aplicar al integrar D, sin tarea propia porque no cambia el
  comportamiento del banco. Si se desea, editar la construcción de `ESPECIES_EVAL` para leer el
  nombre del mapa en vez de la cadena literal.
