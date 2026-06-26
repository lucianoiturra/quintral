# Priors geográficos para el identificador (Sub-proyecto B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasar (opcionalmente) la zona donde se tomó la foto al identificador para que el modelo baje la confianza de especies imposibles en esa zona, y medir el efecto contra el banco de evaluación.

**Architecture:** Una macrozona biogeográfica (3 valores) se inyecta como bloque de texto al prompt. La UI la captura con un `<select>`; el banco de evaluación la deriva de la latitud de cada foto de iNaturalist. El parámetro es opcional en toda la cadena, así que sin zona el comportamiento es idéntico al de A.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest, `tsx`, API de iNaturalist, SDK `@anthropic-ai/sdk`.

## Global Constraints

- **Depende de A** (`docs/superpowers/plans/2026-06-26-banco-evaluacion-hospederos.md`): deben existir `src/lib/identifyClient.ts`, `src/lib/identify.ts` (con `PROMPT_IDENTIFY`, `extractJson`, `parseIdentifyResult`), `src/lib/evalTypes.ts`, `scripts/eval/inaturalist.ts`, `scripts/eval/run-eval.ts` y el banco. B los extiende.
- Tests con **Vitest** (`npm test` = `vitest run`), en carpetas `__tests__` junto al código.
- Alias `@/*` → `./src/*` (en `tsconfig.json` y `vitest.config.ts`). Scripts bajo `scripts/` corren con `tsx`, que resuelve los `paths` del `tsconfig.json` raíz.
- El parámetro `zona` es **opcional** en toda la cadena. Sin zona → comportamiento de A sin cambios.
- La zona inválida en la ruta API se **ignora** (no rompe la identificación), no devuelve error.
- Idioma del código y la UI: español.
- No se cambia el contenido de `PROMPT_IDENTIFY`; solo se le antepone un bloque opcional.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/zonas.ts` | **Nuevo.** `Zona`, `ZONAS`, `zonaPorId`, `zonaPorLatitud`. |
| `src/lib/identify.ts` | **Modificar.** `construirPrompt(zona?)` con bloque geográfico. |
| `src/lib/identifyClient.ts` | **Modificar.** `identificarHospedero` acepta `zona?`. |
| `src/app/api/identify/route.ts` | **Modificar.** Lee/valida `zona` del body. |
| `src/components/IdentifySection.tsx` | **Modificar.** `<select>` de zona; lo manda en el POST. |
| `src/lib/evalTypes.ts` | **Modificar.** `ManifestItem.lat?`, `.lng?`. |
| `scripts/eval/inaturalist.ts` | **Modificar.** `location` de iNat → `lat`/`lng`. |
| `scripts/eval/fetch-dataset.ts` | **Modificar.** Guarda `lat`/`lng` en el manifiesto. |
| `scripts/eval/run-eval.ts` | **Modificar.** Deriva zona por latitud; flag `--sin-zona`. |

---

## Task 1: Zonas y mapeos

**Files:**
- Create: `src/lib/zonas.ts`
- Create: `src/lib/__tests__/zonas.test.ts`

**Interfaces:**
- Produces:
  - `type ZonaId = "norte" | "centro" | "sur"`
  - `interface Zona { id: ZonaId; etiqueta: string; pista: string }`
  - `ZONAS: Zona[]` (3 entradas)
  - `zonaPorId(id: string): Zona | undefined`
  - `zonaPorLatitud(lat: number): Zona`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/__tests__/zonas.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ZONAS, zonaPorId, zonaPorLatitud } from "@/lib/zonas";

describe("ZONAS", () => {
  it("tiene las 3 macrozonas con id, etiqueta y pista", () => {
    expect(ZONAS.map((z) => z.id)).toEqual(["norte", "centro", "sur"]);
    for (const z of ZONAS) {
      expect(z.etiqueta.length).toBeGreaterThan(0);
      expect(z.pista.length).toBeGreaterThan(0);
    }
  });
});

describe("zonaPorId", () => {
  it("devuelve la zona correcta", () => {
    expect(zonaPorId("centro")?.id).toBe("centro");
  });
  it("devuelve undefined para id inexistente", () => {
    expect(zonaPorId("antartica")).toBeUndefined();
  });
});

describe("zonaPorLatitud", () => {
  it("norte por encima de -31.5", () => {
    expect(zonaPorLatitud(-29).id).toBe("norte");
  });
  it("centro entre -31.5 y -36", () => {
    expect(zonaPorLatitud(-33).id).toBe("centro");
  });
  it("sur en -36 o más al sur", () => {
    expect(zonaPorLatitud(-40).id).toBe("sur");
  });
  it("borde -31.5 cae en centro (no norte)", () => {
    expect(zonaPorLatitud(-31.5).id).toBe("centro");
  });
  it("borde -36 cae en sur (no centro)", () => {
    expect(zonaPorLatitud(-36).id).toBe("sur");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- zonas`
Expected: FAIL — "Cannot find module '@/lib/zonas'".

- [ ] **Step 3: Implementar `zonas.ts`**

Crear `src/lib/zonas.ts`:

```typescript
export type ZonaId = "norte" | "centro" | "sur";

export interface Zona {
  id: ZonaId;
  etiqueta: string;
  pista: string;
}

export const ZONAS: Zona[] = [
  {
    id: "norte",
    etiqueta: "Norte Chico (Atacama–Coquimbo)",
    pista:
      "Desierto costero y matorral; dominan cactáceas columnares (quisco, quisco-coquimbano, eulychnia, pingo-pingo, quisquito).",
  },
  {
    id: "centro",
    etiqueta: "Chile central (Valparaíso–Maule)",
    pista:
      "Matorral y bosque esclerófilo; dominan quillay, litre, peumo, boldo, maitén, huingán, colliguay, crucero, corcolén.",
  },
  {
    id: "sur",
    etiqueta: "Centro-sur y sur (Ñuble–Los Lagos)",
    pista:
      "Bosque templado lluvioso y caducifolio; dominan coihue, nothofagus-nitida, arrayán, maqui, chacay, barraco.",
  },
];

export function zonaPorId(id: string): Zona | undefined {
  return ZONAS.find((z) => z.id === id);
}

export function zonaPorLatitud(lat: number): Zona {
  // Chile: latitudes negativas; más negativo = más al sur.
  if (lat > -31.5) return ZONAS[0]; // norte
  if (lat > -36) return ZONAS[1]; // centro  (incluye exactamente -31.5)
  return ZONAS[2]; // sur (incluye exactamente -36)
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- zonas`
Expected: PASS (todos los casos, incluidos los bordes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/zonas.ts src/lib/__tests__/zonas.test.ts
git commit -m "feat: macrozonas biogeograficas y mapeo por latitud"
```

---

## Task 2: `construirPrompt` con bloque geográfico

**Files:**
- Modify: `src/lib/identify.ts`
- Modify: `src/lib/__tests__/identify.test.ts` (agregar casos; no tocar los existentes)

**Interfaces:**
- Consumes: `Zona` de `@/lib/zonas`; `PROMPT_IDENTIFY` (constante existente en este archivo).
- Produces: `construirPrompt(zona?: Zona): string`.

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `src/lib/__tests__/identify.test.ts` (dejar el resto intacto):

```typescript
import { construirPrompt, PROMPT_IDENTIFY } from "@/lib/identify";
import { ZONAS } from "@/lib/zonas";

describe("construirPrompt", () => {
  it("sin zona devuelve el prompt base sin cambios", () => {
    expect(construirPrompt()).toBe(PROMPT_IDENTIFY);
  });

  it("con zona antepone un bloque con la etiqueta y la pista", () => {
    const centro = ZONAS.find((z) => z.id === "centro")!;
    const prompt = construirPrompt(centro);
    expect(prompt).toContain(centro.etiqueta);
    expect(prompt).toContain(centro.pista);
    expect(prompt).toContain(PROMPT_IDENTIFY);
    // el bloque geográfico va antes del prompt base
    expect(prompt.indexOf(centro.etiqueta)).toBeLessThan(prompt.indexOf(PROMPT_IDENTIFY));
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- identify`
Expected: FAIL — `construirPrompt` no existe (error de import/typecheck).

- [ ] **Step 3: Implementar `construirPrompt`**

En `src/lib/identify.ts`, después de la definición de `PROMPT_IDENTIFY`, agregar el import de `Zona` arriba del archivo:

```typescript
import type { Zona } from "@/lib/zonas";
```

y la función (junto a las demás exportadas):

```typescript
export function construirPrompt(zona?: Zona): string {
  if (!zona) return PROMPT_IDENTIFY;
  const bloque = `Contexto geográfico: la foto fue tomada en ${zona.etiqueta}. ${zona.pista}
Usa la distribución conocida de cada especie en Chile: reduce la confianza de especies que no
crecen en esa zona. No la elimines del todo si la imagen lo sugiere fuertemente, pero prioriza
las plausibles para la zona.

`;
  return bloque + PROMPT_IDENTIFY;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- identify`
Expected: PASS — los casos nuevos y todos los existentes de `identify.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/identify.ts src/lib/__tests__/identify.test.ts
git commit -m "feat: construirPrompt antepone bloque geografico segun la zona"
```

---

## Task 3: `identificarHospedero` acepta zona

**Files:**
- Modify: `src/lib/identifyClient.ts`
- Modify: `src/lib/__tests__/identifyClient.test.ts` (agregar casos)

**Interfaces:**
- Consumes: `construirPrompt` de `@/lib/identify`; `Zona` de `@/lib/zonas`.
- Produces: `identificarHospedero(imagenBase64: string, mediaType: AllowedMediaType, zona?: Zona): Promise<IdentifyResult>`.

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `src/lib/__tests__/identifyClient.test.ts` (dentro del `describe` existente o uno nuevo; reutiliza el `createMock` ya declarado en el archivo):

```typescript
import { ZONAS } from "@/lib/zonas";

describe("identificarHospedero con zona", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("incluye la pista de la zona en el texto enviado a la IA", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    const norte = ZONAS.find((z) => z.id === "norte")!;
    await identificarHospedero("AAAA", "image/jpeg", norte);
    const arg = createMock.mock.calls[0][0];
    const textBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "text");
    expect(textBlock.text).toContain(norte.pista);
  });

  it("sin zona no incluye contexto geográfico", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    await identificarHospedero("AAAA", "image/jpeg");
    const arg = createMock.mock.calls[0][0];
    const textBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "text");
    expect(textBlock.text).not.toContain("Contexto geográfico");
  });
});
```

> Nota: si el archivo importa `identificarHospedero` y `createMock` al inicio (lo hace en A),
> no repitas esos imports; agrega solo `import { ZONAS } from "@/lib/zonas";` arriba.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- identifyClient`
Expected: FAIL — el texto no contiene la pista (la zona aún se ignora).

- [ ] **Step 3: Modificar `identificarHospedero`**

En `src/lib/identifyClient.ts`:

1. Reemplazar el import del prompt:

```typescript
import { parseIdentifyResult, extractJson, construirPrompt } from "@/lib/identify";
import type { Zona } from "@/lib/zonas";
```

(Quitar `PROMPT_IDENTIFY` del import si quedó sin uso.)

2. Cambiar la firma y el uso del prompt:

```typescript
export async function identificarHospedero(
  imagenBase64: string,
  mediaType: AllowedMediaType,
  zona?: Zona,
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
          { type: "text", text: construirPrompt(zona) },
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
Expected: PASS — casos nuevos y los de A.

- [ ] **Step 5: Commit**

```bash
git add src/lib/identifyClient.ts src/lib/__tests__/identifyClient.test.ts
git commit -m "feat: identificarHospedero acepta zona y la pasa al prompt"
```

---

## Task 4: La ruta API lee y valida la zona

**Files:**
- Modify: `src/app/api/identify/route.ts`
- Modify: `src/app/api/identify/__tests__/route.test.ts` (agregar casos)

**Interfaces:**
- Consumes: `zonaPorId` de `@/lib/zonas`; `identificarHospedero` (ahora con `zona?`).
- Produces: la ruta acepta `zona?: string` en el body.

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `src/app/api/identify/__tests__/route.test.ts` (dentro del `describe` existente, reutilizando `createMock` y `req`):

```typescript
it("pasa la zona resuelta a la IA cuando es válida", async () => {
  createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
  await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg", zona: "centro" }));
  const arg = createMock.mock.calls[0][0];
  const textBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "text");
  expect(textBlock.text).toContain("Chile central");
});

it("ignora una zona inválida sin romper (200)", async () => {
  createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
  const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg", zona: "marte" }));
  expect(res.status).toBe(200);
  const arg = createMock.mock.calls[0][0];
  const textBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "text");
  expect(textBlock.text).not.toContain("Contexto geográfico");
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- route`
Expected: FAIL — el primer caso no encuentra "Chile central" (la zona aún no se lee).

- [ ] **Step 3: Modificar `route.ts`**

En `src/app/api/identify/route.ts`:

1. Agregar el import:

```typescript
import { zonaPorId } from "@/lib/zonas";
```

2. Ampliar el tipo del body y leer la zona:

```typescript
  let body: { imageBase64?: string; mediaType?: string; zona?: string };
```

3. Antes de la llamada, resolver la zona (id inválido → `undefined`) y pasarla:

```typescript
  try {
    const zona = body.zona ? zonaPorId(body.zona) : undefined;
    const resultado = await identificarHospedero(
      imageBase64,
      mediaType as AllowedMediaType,
      zona,
    );
    return Response.json(resultado);
  } catch {
    return Response.json({ error: "Falló el análisis de la imagen" }, { status: 500 });
  }
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- route`
Expected: PASS — casos nuevos y los 4 existentes.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/identify/route.ts src/app/api/identify/__tests__/route.test.ts
git commit -m "feat: la ruta /api/identify acepta y valida la zona"
```

---

## Task 5: Selector de zona en la UI

**Files:**
- Modify: `src/components/IdentifySection.tsx`

**Interfaces:**
- Consumes: `ZONAS`, `ZonaId` de `@/lib/zonas`.
- Produces: el POST a `/api/identify` incluye `zona` cuando el usuario eligió una.

- [ ] **Step 1: Agregar el import y el estado**

En `src/components/IdentifySection.tsx`:

1. Import (junto a los demás de `@/lib/...`):

```typescript
import { ZONAS, type ZonaId } from "@/lib/zonas";
```

2. Nuevo estado (junto a los otros `useState`):

```typescript
  const [zonaId, setZonaId] = useState<ZonaId | "">("");
```

- [ ] **Step 2: Incluir la zona en el cuerpo del POST**

En la función `analizar`, reemplazar el `body` del `fetch`:

```typescript
        body: JSON.stringify({
          imageBase64: base64,
          mediaType,
          ...(zonaId ? { zona: zonaId } : {}),
        }),
```

- [ ] **Step 3: Renderizar el `<select>`**

En el JSX, dentro de `.card.card-pad` (antes de `.identify-actions`), después del párrafo
`.identify-hint`, agregar:

```tsx
          <label className="identify-zona">
            <span>¿Dónde se tomó la foto? (opcional — mejora la precisión)</span>
            <select value={zonaId} onChange={(e) => setZonaId(e.target.value as ZonaId | "")}>
              <option value="">No especificar</option>
              {ZONAS.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.etiqueta}
                </option>
              ))}
            </select>
          </label>
```

- [ ] **Step 4: Verificar que compila y los tests siguen verdes**

Run: `npm test`
Expected: PASS — toda la suite (el cambio de UI no rompe tests existentes).

Run: `npm run build`
Expected: build sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/components/IdentifySection.tsx
git commit -m "feat: selector de zona en IdentifySection"
```

---

## Task 6: Coordenadas en el dataset de evaluación

**Files:**
- Modify: `src/lib/evalTypes.ts`
- Modify: `scripts/eval/inaturalist.ts`
- Modify: `scripts/eval/__tests__/inaturalist.test.ts` (agregar casos)
- Modify: `scripts/eval/fetch-dataset.ts`

**Interfaces:**
- Consumes: `INatObservation` (existente, se le agrega `location?`).
- Produces:
  - `ManifestItem` con `lat?: number; lng?: number`.
  - `urlsDeFotos(...)` devuelve entradas con `lat?: number; lng?: number`.

- [ ] **Step 1: Extender el tipo del manifiesto**

En `src/lib/evalTypes.ts`, agregar dos campos opcionales a `ManifestItem`:

```typescript
export interface ManifestItem {
  archivo: string;
  hospedero: Host;
  fuente: string;
  lat?: number;
  lng?: number;
}
```

- [ ] **Step 2: Escribir el test que falla (parseo de coordenadas)**

Añadir a `scripts/eval/__tests__/inaturalist.test.ts`, dentro del `describe("urlsDeFotos (pura)")`:

```typescript
  it("parsea location 'lat,lng' a números en cada entrada", () => {
    const obs: INatObservation[] = [
      {
        id: 1,
        uri: "https://inat/1",
        location: "-33.45,-70.66",
        photos: [{ id: 10, url: "https://x/square.jpg" }],
      },
    ];
    const out = urlsDeFotos(obs, 5);
    expect(out[0].lat).toBeCloseTo(-33.45);
    expect(out[0].lng).toBeCloseTo(-70.66);
  });

  it("sin location deja lat/lng como undefined", () => {
    const obs: INatObservation[] = [
      { id: 2, photos: [{ id: 20, url: "https://y/square.jpg" }] },
    ];
    const out = urlsDeFotos(obs, 5);
    expect(out[0].lat).toBeUndefined();
    expect(out[0].lng).toBeUndefined();
  });
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test -- inaturalist`
Expected: FAIL — `out[0].lat` es `undefined` cuando debería ser -33.45.

- [ ] **Step 4: Implementar el parseo en `inaturalist.ts`**

En `scripts/eval/inaturalist.ts`:

1. Agregar `location?` a la interfaz:

```typescript
export interface INatObservation {
  id: number;
  uri?: string;
  location?: string; // "lat,lng"
  photos: { id: number; url: string }[];
}
```

2. Cambiar el tipo de retorno y el cuerpo de `urlsDeFotos`:

```typescript
export function urlsDeFotos(
  observaciones: INatObservation[],
  max: number,
): { id: number; url: string; fuente: string; lat?: number; lng?: number }[] {
  const out: { id: number; url: string; fuente: string; lat?: number; lng?: number }[] = [];
  for (const obs of observaciones) {
    const foto = obs.photos?.[0];
    if (!foto) continue;
    let lat: number | undefined;
    let lng: number | undefined;
    if (obs.location) {
      const [la, ln] = obs.location.split(",").map(Number);
      if (Number.isFinite(la) && Number.isFinite(ln)) {
        lat = la;
        lng = ln;
      }
    }
    out.push({
      id: obs.id,
      url: foto.url.replace("/square.", "/medium.").replace("/thumb.", "/medium."),
      fuente: obs.uri ?? `https://www.inaturalist.org/observations/${obs.id}`,
      lat,
      lng,
    });
    if (out.length >= max) break;
  }
  return out;
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- inaturalist`
Expected: PASS — casos nuevos y los de A.

- [ ] **Step 6: Guardar las coordenadas en el manifiesto**

En `scripts/eval/fetch-dataset.ts`, en el bucle que arma los `items`, propagar `lat`/`lng`:

```typescript
      items.push({
        archivo: archivoRel,
        hospedero: especie.slug,
        fuente: foto.fuente,
        lat: foto.lat,
        lng: foto.lng,
      });
```

- [ ] **Step 7: Correr toda la suite**

Run: `npm test`
Expected: PASS — nada roto.

- [ ] **Step 8: Commit**

```bash
git add src/lib/evalTypes.ts scripts/eval/inaturalist.ts scripts/eval/__tests__/inaturalist.test.ts scripts/eval/fetch-dataset.ts
git commit -m "feat: el banco de evaluacion guarda coordenadas de cada foto"
```

---

## Task 7: `run-eval` deriva la zona y permite baseline

**Files:**
- Modify: `scripts/eval/run-eval.ts`

**Interfaces:**
- Consumes: `zonaPorLatitud` de `@/lib/zonas`; `identificarHospedero` (con `zona?`); `ManifestItem` con `lat`/`lng`.
- Produces: resultados nombrados `<fecha>-conzona.json` / `<fecha>-sinzona.json`.

- [ ] **Step 1: Detectar el flag y derivar la zona por latitud**

En `scripts/eval/run-eval.ts`:

1. Agregar el import:

```typescript
import { zonaPorLatitud } from "@/lib/zonas";
```

2. Leer el flag al inicio de `main` (o a nivel de módulo):

```typescript
  const sinZona = process.argv.includes("--sin-zona");
```

3. Cambiar `identificarItem` para que derive y pase la zona (salvo en modo baseline). Como
`identificarItem` necesita conocer `sinZona`, conviértela en una función construida dentro de
`main` (o pásale el flag). Reemplazar la `identificarItem` de A por:

```typescript
  const identificarItem = async (item: ManifestItem) => {
    const ruta = path.join(DATASET_DIR, item.archivo);
    const base64 = fs.readFileSync(ruta).toString("base64");
    const zona =
      !sinZona && typeof item.lat === "number" ? zonaPorLatitud(item.lat) : undefined;
    return identificarHospedero(base64, mediaTypePorExtension(item.archivo), zona);
  };
```

> Si en A `identificarItem` estaba definida a nivel de módulo, muévela dentro de `main`
> (después de calcular `sinZona`) para que vea el flag. `mediaTypePorExtension` y las constantes
> `DATASET_DIR`/`RESULTS_DIR` siguen a nivel de módulo.

- [ ] **Step 2: Nombrar el archivo de salida según el modo**

Reemplazar la línea que arma `salida`:

```typescript
  const sufijo = sinZona ? "sinzona" : "conzona";
  const salida = path.join(RESULTS_DIR, `${selloDeTiempo()}-${sufijo}.json`);
```

Y la llamada a `evaluarManifiesto` usa el `identificarItem` local:

```typescript
  const resultado = await evaluarManifiesto(manifest.items, identificarItem);
```

- [ ] **Step 3: Reflejar el modo en la salida por consola**

Después de imprimir el acierto top-2, agregar:

```typescript
  console.log(`Modo: ${sinZona ? "SIN zona (baseline)" : "CON zona"}`);
```

- [ ] **Step 4: Prueba de humo — baseline y con zona**

Requiere `ANTHROPIC_API_KEY` y haber corrido `npm run eval:fetch` (Task 6 ya guarda coords).

Run: `npm run eval:run -- --sin-zona`
Expected: imprime "Modo: SIN zona (baseline)" y escribe `eval/results/<fecha>-sinzona.json`.

Run: `npm run eval:run`
Expected: imprime "Modo: CON zona" y escribe `eval/results/<fecha>-conzona.json`.

Comparar `aciertoTop1`/`aciertoTop2` entre ambos JSON: la pista geográfica debería subir (o al
menos no bajar) el acierto.

- [ ] **Step 5: Commit**

```bash
git add scripts/eval/run-eval.ts
git commit -m "feat: run-eval deriva zona por latitud y soporta baseline --sin-zona"
```

---

## Self-Review (cobertura del spec)

- **Zonas (`Zona`, `ZONAS`, `zonaPorId`, `zonaPorLatitud`):** Task 1. ✓
- **`construirPrompt(zona?)` + bloque geográfico, base intacta:** Task 2. ✓
- **`identificarHospedero` acepta `zona?`:** Task 3. ✓
- **Ruta API lee/valida `zona`, ignora inválida sin romper:** Task 4. ✓
- **`<select>` de zona en la UI y envío en el POST:** Task 5. ✓
- **`ManifestItem.lat?/.lng?` + iNat `location` parseado:** Task 6. ✓
- **`run-eval` deriva zona por latitud + flag `--sin-zona` + nombres de salida:** Task 7. ✓
- **Retrocompatibilidad sin zona (comportamiento de A):** Tasks 2–4 (parámetro opcional, base intacta). ✓
- **Cortes de latitud −31.5 y −36 con bordes definidos:** Task 1 (tests de borde). ✓
- **Medición con/sin zona comparando dos JSON:** Task 7. ✓

### Notas de consistencia

- `zonaPorLatitud` devuelve `Zona` (nunca `undefined`); `zonaPorId` sí puede devolver `undefined`. Usos coherentes en Tasks 4 y 7.
- La firma `identificarHospedero(imagenBase64, mediaType, zona?)` es idéntica en Tasks 3, 4 y 7.
- El flag se llama `--sin-zona` en todo el plan; el sufijo de archivo, `sinzona`/`conzona`.
