# Múltiples fotos por hospedero (Sub-proyecto C) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir subir hasta 4 fotos del mismo árbol hospedero (vistas guiadas: corteza, hoja, árbol, fruto) y que el modelo las combine en una sola identificación, midiendo el efecto contra el banco.

**Architecture:** Se generaliza `identificarHospedero` para recibir un arreglo de `ImagenEntrada`. El `content` del mensaje intercala etiqueta+imagen por foto y termina con el prompt (geo de B). La UI extrae un componente `RanurasFotos` con 4 casillas. El banco baja varias fotos por observación (`manifestMulti.json`) y `run-eval --multi` las evalúa juntas.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest + Testing Library, `tsx`, SDK `@anthropic-ai/sdk`, API de iNaturalist.

## Global Constraints

- **Depende de A y B**: deben existir `src/lib/identifyClient.ts` (con `identificarHospedero(imagenBase64, mediaType, zona?)`, `ALLOWED_MEDIA_TYPES`, `AllowedMediaType`), `src/lib/identify.ts` (`construirPrompt(zona?)`, `PROMPT_IDENTIFY`), `src/lib/zonas.ts` (`Zona`, `zonaPorId`, `zonaPorLatitud`), `src/lib/evalTypes.ts` (`ManifestItem` con `lat?`/`lng?`), `scripts/eval/{inaturalist,fetch-dataset,run-eval,evaluate,metrics}.ts`.
- Tests con **Vitest** (`npm test`), en `__tests__` junto al código. Componentes con `@testing-library/react` (entorno jsdom ya configurado).
- Alias `@/*` → `./src/*`. Scripts con `tsx` (resuelve `paths` del tsconfig raíz).
- Tope de **4 imágenes** por identificación; etiquetas `EtiquetaFoto = "corteza" | "hoja" | "arbol" | "fruto"`.
- El flujo de una sola foto debe seguir funcionando (arreglo de uno).
- `AllowedMediaType` se mantiene como fuente única en `identifyClient.ts`.
- Idioma del código y UI: español.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/imagenes.ts` | **Nuevo.** `EtiquetaFoto`, `ImagenEntrada`, `ETIQUETAS_FOTO`, `ETIQUETAS_FOTO_TEXTO`. |
| `src/lib/identify.ts` | **Modificar.** `notaMultiFoto()`. |
| `src/lib/identifyClient.ts` | **Modificar.** `identificarHospedero(imagenes[], zona?)`. |
| `src/app/api/identify/route.ts` | **Modificar.** Body `{ imagenes[] }`; valida y topea a 4. |
| `src/components/RanurasFotos.tsx` | **Nuevo.** 4 ranuras guiadas. |
| `src/components/IdentifySection.tsx` | **Modificar.** Usa `RanurasFotos`; arma `ImagenEntrada[]`. |
| `src/lib/evalTypes.ts` | **Modificar.** `ManifestMultiItem`, `ManifestMulti`. |
| `scripts/eval/inaturalist.ts` | **Modificar.** `gruposDeFotos()`. |
| `scripts/eval/fetch-dataset.ts` | **Modificar.** Escribe `manifestMulti.json`. |
| `scripts/eval/run-eval.ts` | **Modificar.** Flag `--multi`. |

---

## Task 1: Tipos de imagen (`imagenes.ts`)

**Files:**
- Create: `src/lib/imagenes.ts`
- Create: `src/lib/__tests__/imagenes.test.ts`

**Interfaces:**
- Consumes: `AllowedMediaType` de `@/lib/identifyClient` (solo tipo).
- Produces:
  - `type EtiquetaFoto = "corteza" | "hoja" | "arbol" | "fruto"`
  - `interface ImagenEntrada { base64: string; mediaType: AllowedMediaType; etiqueta?: EtiquetaFoto }`
  - `ETIQUETAS_FOTO: { id: EtiquetaFoto; titulo: string }[]`
  - `ETIQUETAS_FOTO_TEXTO: Record<EtiquetaFoto, string>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/__tests__/imagenes.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ETIQUETAS_FOTO, ETIQUETAS_FOTO_TEXTO } from "@/lib/imagenes";

describe("ETIQUETAS_FOTO", () => {
  it("define las 4 vistas guiadas en orden", () => {
    expect(ETIQUETAS_FOTO.map((e) => e.id)).toEqual(["corteza", "hoja", "arbol", "fruto"]);
    for (const e of ETIQUETAS_FOTO) expect(e.titulo.length).toBeGreaterThan(0);
  });
  it("tiene un texto de prompt por cada etiqueta", () => {
    for (const e of ETIQUETAS_FOTO) {
      expect(ETIQUETAS_FOTO_TEXTO[e.id].length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- imagenes`
Expected: FAIL — "Cannot find module '@/lib/imagenes'".

- [ ] **Step 3: Implementar `imagenes.ts`**

Crear `src/lib/imagenes.ts`:

```typescript
import type { AllowedMediaType } from "@/lib/identifyClient";

export type EtiquetaFoto = "corteza" | "hoja" | "arbol" | "fruto";

export interface ImagenEntrada {
  base64: string;
  mediaType: AllowedMediaType;
  etiqueta?: EtiquetaFoto;
}

export const ETIQUETAS_FOTO: { id: EtiquetaFoto; titulo: string }[] = [
  { id: "corteza", titulo: "Corteza" },
  { id: "hoja", titulo: "Hoja (de cerca)" },
  { id: "arbol", titulo: "Árbol completo" },
  { id: "fruto", titulo: "Fruto o flor" },
];

export const ETIQUETAS_FOTO_TEXTO: Record<EtiquetaFoto, string> = {
  corteza: "Foto de la corteza del hospedero",
  hoja: "Foto de las hojas del hospedero",
  arbol: "Foto del árbol hospedero completo",
  fruto: "Foto del fruto o flor del hospedero",
};
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- imagenes`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/imagenes.ts src/lib/__tests__/imagenes.test.ts
git commit -m "feat: tipos e etiquetas de imagen para multiples fotos"
```

---

## Task 2: `notaMultiFoto` en el prompt

**Files:**
- Modify: `src/lib/identify.ts`
- Modify: `src/lib/__tests__/identify.test.ts` (agregar casos)

**Interfaces:**
- Consumes: `EtiquetaFoto` de `@/lib/imagenes`.
- Produces: `notaMultiFoto(imagenes: { etiqueta?: EtiquetaFoto }[]): string`.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `src/lib/__tests__/identify.test.ts`:

```typescript
import { notaMultiFoto } from "@/lib/identify";

describe("notaMultiFoto", () => {
  it("vacío con 0 o 1 imagen", () => {
    expect(notaMultiFoto([])).toBe("");
    expect(notaMultiFoto([{}])).toBe("");
  });
  it("con 2+ imágenes menciona el mismo árbol y el número", () => {
    const nota = notaMultiFoto([{ etiqueta: "corteza" }, { etiqueta: "hoja" }]);
    expect(nota).toContain("MISMO árbol");
    expect(nota).toContain("2");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- identify`
Expected: FAIL — `notaMultiFoto` no existe.

- [ ] **Step 3: Implementar `notaMultiFoto`**

En `src/lib/identify.ts`, agregar el import arriba:

```typescript
import type { EtiquetaFoto } from "@/lib/imagenes";
```

y la función exportada:

```typescript
export function notaMultiFoto(imagenes: { etiqueta?: EtiquetaFoto }[]): string {
  if (imagenes.length <= 1) return "";
  return `Te muestro ${imagenes.length} fotografías del MISMO árbol hospedero (distintas vistas). Identifícalo combinando la información de todas.`;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- identify`
Expected: PASS — casos nuevos y existentes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/identify.ts src/lib/__tests__/identify.test.ts
git commit -m "feat: notaMultiFoto para prompts de varias fotos"
```

---

## Task 3: `identificarHospedero` recibe un arreglo de imágenes

**Files:**
- Modify: `src/lib/identifyClient.ts`
- Modify: `src/lib/__tests__/identifyClient.test.ts`

**Interfaces:**
- Consumes: `ImagenEntrada`, `ETIQUETAS_FOTO_TEXTO` de `@/lib/imagenes`; `construirPrompt`, `notaMultiFoto` de `@/lib/identify`; `Zona` de `@/lib/zonas`.
- Produces: `identificarHospedero(imagenes: ImagenEntrada[], zona?: Zona): Promise<IdentifyResult>`.

- [ ] **Step 1: Escribir el test que falla**

Reemplazar/añadir en `src/lib/__tests__/identifyClient.test.ts` casos para la nueva firma
(mantener el `createMock`/`vi.mock` del archivo; ajustar las llamadas que antes pasaban
`("AAAA", "image/jpeg")` a `([{ base64: "AAAA", mediaType: "image/jpeg" }])`):

```typescript
it("con varias imágenes envía todas y la nota multi-foto", async () => {
  createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
  await identificarHospedero([
    { base64: "AAAA", mediaType: "image/jpeg", etiqueta: "corteza" },
    { base64: "BBBB", mediaType: "image/jpeg", etiqueta: "hoja" },
  ]);
  const arg = createMock.mock.calls[0][0];
  const content = arg.messages[0].content as { type: string; text?: string; source?: { data: string } }[];
  const imagenes = content.filter((b) => b.type === "image");
  expect(imagenes.map((b) => b.source!.data)).toEqual(["AAAA", "BBBB"]);
  const textos = content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  expect(textos).toContain("MISMO árbol");
  expect(textos).toContain("corteza");
});

it("con una sola imagen no incluye la nota multi-foto", async () => {
  createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
  await identificarHospedero([{ base64: "AAAA", mediaType: "image/jpeg" }]);
  const arg = createMock.mock.calls[0][0];
  const textos = (arg.messages[0].content as { type: string; text?: string }[])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  expect(textos).not.toContain("MISMO árbol");
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- identifyClient`
Expected: FAIL — la firma actual no acepta un arreglo.

- [ ] **Step 3: Reescribir `identificarHospedero`**

En `src/lib/identifyClient.ts`:

1. Imports:

```typescript
import { parseIdentifyResult, extractJson, construirPrompt, notaMultiFoto } from "@/lib/identify";
import { ETIQUETAS_FOTO_TEXTO, type ImagenEntrada } from "@/lib/imagenes";
import type { Zona } from "@/lib/zonas";
```

2. Cuerpo:

```typescript
export async function identificarHospedero(
  imagenes: ImagenEntrada[],
  zona?: Zona,
): Promise<IdentifyResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content: Anthropic.ContentBlockParam[] = [];
  const nota = notaMultiFoto(imagenes);
  if (nota) content.push({ type: "text", text: nota });

  for (const img of imagenes) {
    if (img.etiqueta) {
      content.push({ type: "text", text: ETIQUETAS_FOTO_TEXTO[img.etiqueta] + ":" });
    }
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    });
  }
  content.push({ type: "text", text: construirPrompt(zona) });

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseIdentifyResult(extractJson(text));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- identifyClient`
Expected: PASS — casos nuevos. (Otros tests que llamen la firma vieja se corrigen en sus tareas: ruta en Task 4, run-eval en Task 8.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/identifyClient.ts src/lib/__tests__/identifyClient.test.ts
git commit -m "feat: identificarHospedero recibe arreglo de imagenes con etiquetas"
```

---

## Task 4: La ruta API recibe `imagenes[]`

**Files:**
- Modify: `src/app/api/identify/route.ts`
- Modify: `src/app/api/identify/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `identificarHospedero(imagenes[], zona?)`; `ImagenEntrada` de `@/lib/imagenes`; `ALLOWED_MEDIA_TYPES`, `AllowedMediaType` de `@/lib/identifyClient`; `zonaPorId` de `@/lib/zonas`.
- Produces: `POST /api/identify` con body `{ imagenes: ImagenEntrada[]; zona?: string }`.

- [ ] **Step 1: Reescribir los tests de la ruta**

Reemplazar el cuerpo de `src/app/api/identify/__tests__/route.test.ts` (mantener el bloque
`vi.mock`/`createMock` y el helper `req`) para la nueva forma del body:

```typescript
describe("POST /api/identify", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  function imagenes(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      base64: "AAAA" + i,
      mediaType: "image/jpeg",
    }));
  }

  it("devuelve un IdentifyResult normalizado", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"esQuintral": true, "opciones": [{"hospedero": "quillay", "confianza": 0.9}, {"hospedero": "litre", "confianza": 0.5}], "fenologia": "en flor", "notas": "ok"}',
        },
      ],
    });
    const res = await POST(req({ imagenes: imagenes(1) }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.opciones[0].hospedero).toBe("quillay");
  });

  it("400 si no hay imágenes", async () => {
    const res = await POST(req({ imagenes: [] }));
    expect(res.status).toBe(400);
  });

  it("400 si algún mediaType no está permitido", async () => {
    const res = await POST(req({ imagenes: [{ base64: "AAAA", mediaType: "application/pdf" }] }));
    expect(res.status).toBe(400);
  });

  it("usa a lo más 4 imágenes aunque lleguen más", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    await POST(req({ imagenes: imagenes(6) }));
    const arg = createMock.mock.calls[0][0];
    const imgs = (arg.messages[0].content as { type: string }[]).filter((b) => b.type === "image");
    expect(imgs).toHaveLength(4);
  });

  it("500 si la IA falla", async () => {
    createMock.mockRejectedValue(new Error("boom"));
    const res = await POST(req({ imagenes: imagenes(1) }));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- route`
Expected: FAIL — la ruta aún espera `imageBase64`/`mediaType`.

- [ ] **Step 3: Reescribir `route.ts`**

Reemplazar `src/app/api/identify/route.ts`:

```typescript
import {
  identificarHospedero,
  ALLOWED_MEDIA_TYPES,
  type AllowedMediaType,
} from "@/lib/identifyClient";
import type { ImagenEntrada } from "@/lib/imagenes";
import { zonaPorId } from "@/lib/zonas";

export const runtime = "nodejs";

const MAX_IMAGENES = 4;

export async function POST(request: Request): Promise<Response> {
  let body: { imagenes?: ImagenEntrada[]; zona?: string };
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

  try {
    const zona = body.zona ? zonaPorId(body.zona) : undefined;
    const resultado = await identificarHospedero(imagenes, zona);
    return Response.json(resultado);
  } catch {
    return Response.json({ error: "Falló el análisis de la imagen" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- route`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/identify/route.ts src/app/api/identify/__tests__/route.test.ts
git commit -m "feat: /api/identify recibe imagenes[] con tope de 4"
```

---

## Task 5: Componente `RanurasFotos`

**Files:**
- Create: `src/components/RanurasFotos.tsx`
- Create: `src/components/__tests__/RanurasFotos.test.tsx`

**Interfaces:**
- Consumes: `ETIQUETAS_FOTO`, `EtiquetaFoto` de `@/lib/imagenes`.
- Produces: componente `RanurasFotos` con props
  `{ archivos: Record<EtiquetaFoto, File | null>; onCambio: (etiqueta: EtiquetaFoto, file: File | null) => void; error?: (msg: string) => void }`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/components/__tests__/RanurasFotos.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RanurasFotos from "@/components/RanurasFotos";

const vacios = { corteza: null, hoja: null, arbol: null, fruto: null };

describe("RanurasFotos", () => {
  it("muestra las 4 ranuras", () => {
    render(<RanurasFotos archivos={vacios} onCambio={() => {}} />);
    expect(screen.getByText("Corteza")).toBeInTheDocument();
    expect(screen.getByText("Hoja (de cerca)")).toBeInTheDocument();
    expect(screen.getByText("Árbol completo")).toBeInTheDocument();
    expect(screen.getByText("Fruto o flor")).toBeInTheDocument();
  });

  it("emite onCambio con un archivo válido", () => {
    const onCambio = vi.fn();
    render(<RanurasFotos archivos={vacios} onCambio={onCambio} />);
    const file = new File(["x"], "corteza.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("Subir Corteza") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onCambio).toHaveBeenCalledWith("corteza", file);
  });

  it("rechaza archivos no permitidos llamando a error y no a onCambio", () => {
    const onCambio = vi.fn();
    const error = vi.fn();
    render(<RanurasFotos archivos={vacios} onCambio={onCambio} error={error} />);
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText("Subir Corteza") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onCambio).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- RanurasFotos`
Expected: FAIL — "Cannot find module '@/components/RanurasFotos'".

- [ ] **Step 3: Implementar `RanurasFotos.tsx`**

Crear `src/components/RanurasFotos.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { ETIQUETAS_FOTO, type EtiquetaFoto } from "@/lib/imagenes";

const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

export default function RanurasFotos({
  archivos,
  onCambio,
  error,
}: {
  archivos: Record<EtiquetaFoto, File | null>;
  onCambio: (etiqueta: EtiquetaFoto, file: File | null) => void;
  error?: (msg: string) => void;
}) {
  const [previas, setPrevias] = useState<Record<EtiquetaFoto, string | null>>({
    corteza: null,
    hoja: null,
    arbol: null,
    fruto: null,
  });

  useEffect(() => {
    return () => {
      Object.values(previas).forEach((u) => u && URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function elegir(etiqueta: EtiquetaFoto, file: File | null) {
    if (file) {
      if (!TIPOS_PERMITIDOS.has(file.type)) {
        error?.("Solo se permiten imágenes JPG, PNG o WEBP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        error?.("La imagen es demasiado grande. Máximo 4 MB.");
        return;
      }
    }
    setPrevias((p) => {
      if (p[etiqueta]) URL.revokeObjectURL(p[etiqueta]!);
      return { ...p, [etiqueta]: file ? URL.createObjectURL(file) : null };
    });
    onCambio(etiqueta, file);
  }

  return (
    <div className="ranuras-fotos">
      {ETIQUETAS_FOTO.map((e) => (
        <div key={e.id} className="ranura">
          <span className="ranura-titulo">{e.titulo}</span>
          <label className="dropzone dropzone--mini">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={`Subir ${e.titulo}`}
              onChange={(ev) => elegir(e.id, ev.target.files?.[0] ?? null)}
              hidden
            />
            {previas[e.id] ? (
              <img src={previas[e.id]!} alt={`Vista previa ${e.titulo}`} className="dropzone-preview" />
            ) : (
              <span className="dropzone-empty">
                <small>Agregar</small>
              </span>
            )}
          </label>
          {archivos[e.id] ? (
            <button type="button" className="btn btn--ghost" onClick={() => elegir(e.id, null)}>
              Quitar
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- RanurasFotos`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RanurasFotos.tsx src/components/__tests__/RanurasFotos.test.tsx
git commit -m "feat: componente RanurasFotos con 4 vistas guiadas"
```

---

## Task 6: `IdentifySection` usa varias fotos

**Files:**
- Modify: `src/components/IdentifySection.tsx`

**Interfaces:**
- Consumes: `RanurasFotos`; `ETIQUETAS_FOTO`, `EtiquetaFoto`, `ImagenEntrada` de `@/lib/imagenes`; `fileToBase64`, `uploadFoto` (existentes).
- Produces: POST a `/api/identify` con `{ imagenes: ImagenEntrada[], ...(zona) }`.

- [ ] **Step 1: Reemplazar estado y handler de archivos**

En `src/components/IdentifySection.tsx`:

1. Imports nuevos (junto a los demás):

```typescript
import RanurasFotos from "@/components/RanurasFotos";
import { ETIQUETAS_FOTO, type EtiquetaFoto, type ImagenEntrada } from "@/lib/imagenes";
```

2. Reemplazar el estado `archivo`/`previa` por:

```typescript
  const [archivos, setArchivos] = useState<Record<EtiquetaFoto, File | null>>({
    corteza: null,
    hoja: null,
    arbol: null,
    fruto: null,
  });
```

3. Helper de archivos no vacíos y handler:

```typescript
  const fotos = ETIQUETAS_FOTO.map((e) => ({ etiqueta: e.id, file: archivos[e.id] }))
    .filter((x): x is { etiqueta: EtiquetaFoto; file: File } => x.file !== null);

  function cambiarFoto(etiqueta: EtiquetaFoto, file: File | null) {
    setArchivos((a) => ({ ...a, [etiqueta]: file }));
    setResultado(null);
    setFotoUrl(null);
    setError(null);
  }
```

- [ ] **Step 2: Reescribir `analizar`**

Reemplazar la función `analizar`:

```typescript
  async function analizar() {
    if (fotos.length === 0) return;

    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const imagenes: ImagenEntrada[] = [];
      let primeraUrl: string | null = null;
      for (const { etiqueta, file } of fotos) {
        const url = await uploadFoto(file);
        if (!primeraUrl) primeraUrl = url;
        const { base64, mediaType } = await fileToBase64(file);
        imagenes.push({ base64, mediaType, etiqueta });
      }
      setFotoUrl(primeraUrl);

      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imagenes, ...(zonaId ? { zona: zonaId } : {}) }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "La IA no pudo analizar la imagen.");
      }

      setResultado((await res.json()) as IdentifyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar.");
    } finally {
      setCargando(false);
    }
  }
```

> Nota: `zonaId` viene de B. `fileToBase64` ya devuelve `{ base64, mediaType }` con un
> `mediaType` del conjunto permitido.

- [ ] **Step 3: Reemplazar el dropzone único por `RanurasFotos` en el JSX**

Sustituir el `<label className="dropzone">…</label>` por:

```tsx
          <RanurasFotos archivos={archivos} onCambio={cambiarFoto} error={setError} />
```

y actualizar el botón Analizar para habilitarse con al menos una foto:

```tsx
              <button
                type="button"
                className="btn btn--primary"
                onClick={analizar}
                disabled={fotos.length === 0 || cargando}
              >
                {cargando ? "Analizando..." : "Analizar"}
              </button>
```

El botón "Limpiar" se muestra si `fotos.length > 0` y limpia todas las ranuras:

```tsx
              {fotos.length > 0 ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setArchivos({ corteza: null, hoja: null, arbol: null, fruto: null })}
                >
                  Limpiar
                </button>
              ) : null}
```

- [ ] **Step 4: Verificar compilación y suite**

Run: `npm test`
Expected: PASS — toda la suite (incluye `CompararSection`, etc.).

Run: `npm run build`
Expected: build sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/components/IdentifySection.tsx
git commit -m "feat: IdentifySection sube varias fotos guiadas"
```

---

## Task 7: Manifiesto múltiple en el banco

**Files:**
- Modify: `src/lib/evalTypes.ts`
- Modify: `scripts/eval/inaturalist.ts`
- Modify: `scripts/eval/__tests__/inaturalist.test.ts`
- Modify: `scripts/eval/fetch-dataset.ts`

**Interfaces:**
- Produces:
  - `ManifestMultiItem { archivos: string[]; hospedero: Host; fuente: string; lat?: number; lng?: number }`, `ManifestMulti { generadoEl: string; items: ManifestMultiItem[] }`.
  - `gruposDeFotos(observaciones, maxObs, fotosPorObs): { id: number; urls: string[]; fuente: string; lat?: number; lng?: number }[]`.

- [ ] **Step 1: Tipos del manifiesto múltiple**

En `src/lib/evalTypes.ts`, agregar:

```typescript
export interface ManifestMultiItem {
  archivos: string[];
  hospedero: Host;
  fuente: string;
  lat?: number;
  lng?: number;
}

export interface ManifestMulti {
  generadoEl: string;
  items: ManifestMultiItem[];
}
```

- [ ] **Step 2: Escribir el test que falla (`gruposDeFotos`)**

Añadir a `scripts/eval/__tests__/inaturalist.test.ts`:

```typescript
import { gruposDeFotos } from "../inaturalist";

describe("gruposDeFotos", () => {
  const obs: INatObservation[] = [
    {
      id: 1,
      uri: "https://inat/1",
      location: "-33.4,-70.6",
      photos: [
        { id: 10, url: "https://a/square.jpg" },
        { id: 11, url: "https://b/square.jpg" },
        { id: 12, url: "https://c/square.jpg" },
      ],
    },
    { id: 2, photos: [{ id: 20, url: "https://d/square.jpg" }] }, // solo 1 foto
  ];

  it("devuelve varias urls por observación, en tamaño medium", () => {
    const grupos = gruposDeFotos(obs, 10, 2);
    expect(grupos[0].urls).toEqual(["https://a/medium.jpg", "https://b/medium.jpg"]);
    expect(grupos[0].lat).toBeCloseTo(-33.4);
  });

  it("respeta maxObs", () => {
    const grupos = gruposDeFotos(obs, 1, 3);
    expect(grupos).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test -- inaturalist`
Expected: FAIL — `gruposDeFotos` no existe.

- [ ] **Step 4: Implementar `gruposDeFotos`**

En `scripts/eval/inaturalist.ts`, agregar (reutiliza el mismo reemplazo de tamaño que
`urlsDeFotos`):

```typescript
function aMedium(url: string): string {
  return url.replace("/square.", "/medium.").replace("/thumb.", "/medium.");
}

export function gruposDeFotos(
  observaciones: INatObservation[],
  maxObs: number,
  fotosPorObs: number,
): { id: number; urls: string[]; fuente: string; lat?: number; lng?: number }[] {
  const out: { id: number; urls: string[]; fuente: string; lat?: number; lng?: number }[] = [];
  for (const obs of observaciones) {
    const fotos = (obs.photos ?? []).slice(0, fotosPorObs);
    if (fotos.length === 0) continue;
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
      urls: fotos.map((f) => aMedium(f.url)),
      fuente: obs.uri ?? `https://www.inaturalist.org/observations/${obs.id}`,
      lat,
      lng,
    });
    if (out.length >= maxObs) break;
  }
  return out;
}
```

> Opcional DRY: `urlsDeFotos` puede reusar `aMedium`; no es obligatorio para esta tarea.

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- inaturalist`
Expected: PASS — casos nuevos y los previos.

- [ ] **Step 6: Escribir `manifestMulti.json` en `fetch-dataset`**

En `scripts/eval/fetch-dataset.ts`:

1. Imports y tipos: agregar `gruposDeFotos` al import de `./inaturalist` y `ManifestMulti`,
   `ManifestMultiItem` al import de `@/lib/evalTypes`.

2. Constante de fotos por observación (junto a `DATASET_DIR`):

```typescript
const FOTOS_POR_OBS = 3;
```

3. Dentro del bucle por especie, después de bajar las fotos del manifiesto simple, agregar la
   construcción del grupo múltiple (solo observaciones con ≥2 fotos):

```typescript
    const grupos = gruposDeFotos(observaciones, especie.fotos, FOTOS_POR_OBS).filter(
      (g) => g.urls.length >= 2,
    );
    for (const g of grupos) {
      const archivos: string[] = [];
      for (let i = 0; i < g.urls.length; i++) {
        const archivoRel = `${especie.slug}/${g.id}-${i}.jpg`;
        await descargar(g.urls[i], path.join(DATASET_DIR, archivoRel));
        archivos.push(archivoRel);
      }
      itemsMulti.push({
        archivos,
        hospedero: especie.slug,
        fuente: g.fuente,
        lat: g.lat,
        lng: g.lng,
      });
    }
```

   Declarar `const itemsMulti: ManifestMultiItem[] = [];` junto a `items`.

4. Después de escribir `manifest.json`, escribir el múltiple:

```typescript
  const manifestMulti: ManifestMulti = { generadoEl: new Date().toISOString(), items: itemsMulti };
  fs.writeFileSync(
    path.join(DATASET_DIR, "manifestMulti.json"),
    JSON.stringify(manifestMulti, null, 2),
  );
  console.log(`Manifiesto múltiple: ${itemsMulti.length} observaciones con ≥2 fotos`);
```

- [ ] **Step 7: Prueba de humo + suite**

Run: `npm test -- inaturalist`
Expected: PASS.

Run: `npm run eval:fetch`
Expected: además de `manifest.json`, se crea `eval/dataset/manifestMulti.json` con
observaciones que tienen ≥2 fotos, y archivos `<id>-0.jpg`, `<id>-1.jpg`, …

- [ ] **Step 8: Commit**

```bash
git add src/lib/evalTypes.ts scripts/eval/inaturalist.ts scripts/eval/__tests__/inaturalist.test.ts scripts/eval/fetch-dataset.ts
git commit -m "feat: banco baja varias fotos por observacion (manifestMulti)"
```

---

## Task 8: `run-eval --multi`

**Files:**
- Modify: `scripts/eval/run-eval.ts`

**Interfaces:**
- Consumes: `ManifestMulti`, `ManifestMultiItem` de `@/lib/evalTypes`; `identificarHospedero(imagenes[], zona?)`; `gruposDeFotos`/`zonaPorLatitud` ya importados en run-eval (zona de B).
- Produces: resultados `<fecha>-multi.json` / `<fecha>-multi-sinzona.json`.

- [ ] **Step 1: Adaptar `identificarItem` a la nueva firma (modo simple)**

En `scripts/eval/run-eval.ts`, el `identificarItem` de A/B llamaba
`identificarHospedero(base64, mediaType, zona)`. Cambiarlo a la firma de arreglo:

```typescript
  const identificarItem = async (item: ManifestItem) => {
    const ruta = path.join(DATASET_DIR, item.archivo);
    const base64 = fs.readFileSync(ruta).toString("base64");
    const zona =
      !sinZona && typeof item.lat === "number" ? zonaPorLatitud(item.lat) : undefined;
    return identificarHospedero(
      [{ base64, mediaType: mediaTypePorExtension(item.archivo) }],
      zona,
    );
  };
```

- [ ] **Step 2: Agregar el modo `--multi`**

1. Detectar el flag junto a `sinZona`:

```typescript
  const multi = process.argv.includes("--multi");
```

2. Construir un `identificarItemMulti` y elegir el manifiesto según el modo. Reemplazar la
   lectura del manifiesto y la llamada a `evaluarManifiesto` por:

```typescript
  if (multi) {
    const mPath = path.join(DATASET_DIR, "manifestMulti.json");
    if (!fs.existsSync(mPath)) {
      console.error("No existe eval/dataset/manifestMulti.json. Corre primero: npm run eval:fetch");
      process.exit(1);
    }
    const manifestMulti = JSON.parse(fs.readFileSync(mPath, "utf-8")) as ManifestMulti;

    const identificarItemMulti = async (item: ManifestMultiItem) => {
      const imagenes = item.archivos.map((archivo) => ({
        base64: fs.readFileSync(path.join(DATASET_DIR, archivo)).toString("base64"),
        mediaType: mediaTypePorExtension(archivo),
      }));
      const zona =
        !sinZona && typeof item.lat === "number" ? zonaPorLatitud(item.lat) : undefined;
      return identificarHospedero(imagenes, zona);
    };

    // adaptamos cada item múltiple a la forma { archivo, hospedero, lat } que espera evaluarManifiesto:
    const itemsAdaptados = manifestMulti.items.map((it) => ({
      archivo: it.archivos[0],
      hospedero: it.hospedero,
      fuente: it.fuente,
      lat: it.lat,
      lng: it.lng,
    }));
    const resultado = await evaluarManifiesto(itemsAdaptados, (item) => {
      const original = manifestMulti.items.find((m) => m.archivos[0] === item.archivo)!;
      return identificarItemMulti(original);
    });

    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const sufijo = sinZona ? "multi-sinzona" : "multi";
    const salida = path.join(RESULTS_DIR, `${selloDeTiempo()}-${sufijo}.json`);
    fs.writeFileSync(salida, JSON.stringify(resultado, null, 2));
    console.log(`\nImágenes evaluadas (multi): ${resultado.totalImagenes}`);
    console.log(`Acierto top-1: ${(resultado.aciertoTop1 * 100).toFixed(1)}%`);
    console.log(`Acierto top-2: ${(resultado.aciertoTop2 * 100).toFixed(1)}%`);
    console.log(`Modo: MULTI ${sinZona ? "(sin zona)" : "(con zona)"}`);
    console.log(`Resultado escrito en ${salida}`);
    return;
  }
```

   Agregar los imports de `ManifestMulti`, `ManifestMultiItem` arriba del archivo.

> El resto de `main` (modo simple) queda igual que en A/B, después de este bloque `if (multi)`.

- [ ] **Step 3: Prueba de humo — multi**

Requiere `ANTHROPIC_API_KEY` y `npm run eval:fetch` (Task 7 ya genera `manifestMulti.json`).

Run: `npm run eval:run -- --multi`
Expected: imprime "Modo: MULTI (con zona)" y escribe `eval/results/<fecha>-multi.json`.

Comparar `aciertoTop1`/`aciertoTop2` de `<fecha>-conzona.json` (1 foto) vs `<fecha>-multi.json`
(varias fotos): ¿sube el acierto al combinar vistas?

- [ ] **Step 4: Commit**

```bash
git add scripts/eval/run-eval.ts
git commit -m "feat: run-eval --multi evalua varias fotos por observacion"
```

---

## Self-Review (cobertura del spec)

- **`ImagenEntrada`, `EtiquetaFoto`, etiquetas (`imagenes.ts`):** Task 1. ✓
- **`identificarHospedero(imagenes[], zona?)` + content intercalado:** Task 3. ✓
- **`notaMultiFoto`:** Task 2. ✓
- **Ruta API `{ imagenes[] }`, valida y topea a 4:** Task 4. ✓
- **`RanurasFotos` (4 ranuras guiadas, validación tamaño/tipo):** Task 5. ✓
- **`IdentifySection` arma `ImagenEntrada[]` y habilita con ≥1 foto:** Task 6. ✓
- **`ManifestMultiItem`/`ManifestMulti` + `gruposDeFotos`:** Task 7. ✓
- **`fetch-dataset` escribe `manifestMulti.json` (K=3, ≥2 fotos):** Task 7. ✓
- **`run-eval --multi` (+ combinable con `--sin-zona`):** Task 8. ✓
- **Una sola foto sigue funcionando (arreglo de uno):** Tasks 3, 4, 8 (modo simple). ✓

### Notas de consistencia

- Firma única `identificarHospedero(imagenes: ImagenEntrada[], zona?)` en Tasks 3, 4, 8.
- `ImagenEntrada = { base64, mediaType, etiqueta? }` idéntica en imagenes.ts, ruta y UI.
- `Record<EtiquetaFoto, File | null>` con claves `corteza/hoja/arbol/fruto` en Tasks 5 y 6.
- El sufijo de resultados es `multi` / `multi-sinzona`; en B era `conzona`/`sinzona`. No colisionan.
- **Dependencia de orden con B en `run-eval.ts`:** Task 8 reescribe el `identificarItem` que B había dejado con la firma `(base64, mediaType, zona)`; tras C queda con la firma de arreglo. Ejecutar C después de B.
