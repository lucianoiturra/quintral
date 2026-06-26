# Identificador de Hospederos — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar el identificador de hospederos de 4 a 31 especies, devolver las 2 opciones más probables con barras de confianza, y mejorar la precisión con un prompt botánico de razonamiento.

**Architecture:** Se expande el tipo `Host` como fuente única de verdad para todo el sistema — identificador, formulario y mapa. `IdentifyResult` pasa de un campo `hospederoProbable` a un array `opciones: [IdentifyOption, IdentifyOption]`. El prompt usa chain-of-thought (describir antes de concluir) para mejorar precisión. El filtro del mapa se vuelve dinámico sobre las observaciones reales.

**Tech Stack:** Next.js 14, TypeScript, React, Vitest, Claude API (`@anthropic-ai/sdk`)

## Global Constraints

- Comando de tests: `npm test` (alias de `vitest run`)
- Todos los valores de `Host` son kebab-case minúscula, sin espacios
- `otro` es siempre el fallback válido — nunca `null` o `undefined`
- Los tests usan Vitest con `describe/it/expect`; no usar Jest
- No modificar el schema de Supabase — `hospedero` ya es `text` sin enum

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/lib/types.ts` | Modificar | Tipo `Host` × 31; interfaces `IdentifyOption` e `IdentifyResult` |
| `src/lib/hosts.ts` | Modificar | `HOSPEDEROS`, `ETIQUETAS`, `COLORES` para los 31 hospederos |
| `src/lib/__tests__/hosts.test.ts` | Modificar | Tests actualizados a 31 hospederos |
| `src/lib/identify.ts` | Modificar | Prompt CoT + `parseIdentifyResult` para nueva estructura |
| `src/lib/__tests__/identify.test.ts` | Modificar | Tests para `opciones: [IdentifyOption, IdentifyOption]` |
| `src/app/api/identify/__tests__/route.test.ts` | Modificar | Mock y aserciones con nueva estructura |
| `src/components/IdentifySection.tsx` | Modificar | Guía de foto; 2 barras; umbral 0.4; prefill corregido |
| `src/components/MapSection.tsx` | Modificar | Filtro dinámico sobre observaciones reales |

---

### Tarea 1: Expandir el tipo `Host` e interfaces de `IdentifyResult`

**Archivos:**
- Modificar: `src/lib/types.ts`

**Interfaces:**
- Produce: tipo `Host` (31 valores), interface `IdentifyOption`, interface `IdentifyResult`

- [ ] **Paso 1: Reemplazar el contenido completo de `src/lib/types.ts`**

```typescript
export type Host =
  | "alamo"
  | "aromo"
  | "arrayan"
  | "barraco"
  | "boldo"
  | "chacay"
  | "coihue"
  | "colliguay"
  | "corcolen"
  | "crucero"
  | "eulychnia-breviflora"
  | "eulychnia-castanea"
  | "huingan"
  | "litre"
  | "maqui"
  | "maiten"
  | "manzano"
  | "nothofagus-nitida"
  | "olivo"
  | "peral"
  | "peumo"
  | "pingo-pingo"
  | "platano-oriental"
  | "quillay"
  | "quisco"
  | "quisco-coquimbano"
  | "quisco-litoralis"
  | "quisco-skottsbergii"
  | "quisquito"
  | "sauce"
  | "otro";

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

export interface IdentifyOption {
  hospedero: Host;
  confianza: number; // 0..1
}

export interface IdentifyResult {
  esQuintral: boolean;
  opciones: [IdentifyOption, IdentifyOption]; // top 2, mayor confianza primero
  fenologia: string;
  notas: string;
}
```

- [ ] **Paso 2: Verificar que TypeScript no rompe por el cambio de tipo**

```bash
npx tsc --noEmit
```

Esperado: errores en `hosts.ts`, `identify.ts`, `IdentifySection.tsx` (aún no actualizados). Ignorar por ahora — se resuelven en las tareas siguientes.

- [ ] **Paso 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: expandir Host a 31 valores e IdentifyResult con opciones"
```

---

### Tarea 2: Expandir `hosts.ts` y sus tests

**Archivos:**
- Modificar: `src/lib/hosts.ts`
- Modificar: `src/lib/__tests__/hosts.test.ts`

**Interfaces:**
- Consume: `Host` (Tarea 1)
- Produce: `HOSPEDEROS: Host[]`, `colorHospedero(h: Host): string`, `etiquetaHospedero(h: Host): string`

- [ ] **Paso 1: Escribir los tests fallidos en `src/lib/__tests__/hosts.test.ts`**

Reemplazar el contenido completo del archivo:

```typescript
import { describe, it, expect } from "vitest";
import { HOSPEDEROS, colorHospedero, etiquetaHospedero } from "@/lib/hosts";

describe("hosts", () => {
  it("incluye los 31 hospederos", () => {
    expect(HOSPEDEROS).toHaveLength(31);
    expect(HOSPEDEROS).toContain("peumo");
    expect(HOSPEDEROS).toContain("boldo");
    expect(HOSPEDEROS).toContain("quillay");
    expect(HOSPEDEROS).toContain("eulychnia-breviflora");
    expect(HOSPEDEROS).toContain("otro");
  });

  it("da un color hexadecimal distinto por cada hospedero", () => {
    const colores = HOSPEDEROS.map(colorHospedero);
    expect(new Set(colores).size).toBe(colores.length);
    colores.forEach((c) => expect(c).toMatch(/^#[0-9a-fA-F]{6}$/));
  });

  it("etiquetaHospedero devuelve nombre legible", () => {
    expect(etiquetaHospedero("quillay")).toBe("Quillay");
    expect(etiquetaHospedero("platano-oriental")).toBe("Plátano oriental");
    expect(etiquetaHospedero("pingo-pingo")).toBe("Pingo-pingo");
    expect(etiquetaHospedero("eulychnia-breviflora")).toBe("Eulychnia breviflora");
    expect(etiquetaHospedero("nothofagus-nitida")).toBe("Nothofagus nitida");
    expect(etiquetaHospedero("otro")).toBe("Otro");
  });
});
```

- [ ] **Paso 2: Ejecutar tests — verificar que fallan**

```bash
npm test -- src/lib/__tests__/hosts.test.ts
```

Esperado: FAIL — `HOSPEDEROS` aún tiene 5 elementos.

- [ ] **Paso 3: Reemplazar el contenido completo de `src/lib/hosts.ts`**

```typescript
import type { Host } from "@/lib/types";

export const HOSPEDEROS: Host[] = [
  "alamo", "aromo", "arrayan", "barraco", "boldo",
  "chacay", "coihue", "colliguay", "corcolen", "crucero",
  "eulychnia-breviflora", "eulychnia-castanea",
  "huingan", "litre", "maqui", "maiten", "manzano",
  "nothofagus-nitida", "olivo", "peral", "peumo",
  "pingo-pingo", "platano-oriental", "quillay",
  "quisco", "quisco-coquimbano", "quisco-litoralis", "quisco-skottsbergii",
  "quisquito", "sauce", "otro",
];

const ETIQUETAS: Record<Host, string> = {
  alamo: "Álamo",
  aromo: "Aromo",
  arrayan: "Arrayán",
  barraco: "Barraco",
  boldo: "Boldo",
  chacay: "Chacay",
  coihue: "Coihue",
  colliguay: "Colliguay",
  corcolen: "Corcolén",
  crucero: "Crucero",
  "eulychnia-breviflora": "Eulychnia breviflora",
  "eulychnia-castanea": "Eulychnia castanea",
  huingan: "Huingán",
  litre: "Litre",
  maqui: "Maqui",
  maiten: "Maitén",
  manzano: "Manzano",
  "nothofagus-nitida": "Nothofagus nitida",
  olivo: "Olivo",
  peral: "Peral",
  peumo: "Peumo",
  "pingo-pingo": "Pingo-pingo",
  "platano-oriental": "Plátano oriental",
  quillay: "Quillay",
  quisco: "Quisco",
  "quisco-coquimbano": "Quisco coquimbano",
  "quisco-litoralis": "Quisco litoralis",
  "quisco-skottsbergii": "Quisco skottsbergii",
  quisquito: "Quisquito",
  sauce: "Sauce",
  otro: "Otro",
};

const COLORES: Record<Host, string> = {
  // nativas matorral
  aromo: "#e0a106",
  arrayan: "#1a7a4a",
  boldo: "#4a9e6b",
  chacay: "#5c7a3e",
  colliguay: "#2e8b57",
  corcolen: "#6b8e4e",
  crucero: "#8b7355",
  huingan: "#d4880f",
  litre: "#8e44ad",
  maqui: "#7b2d8b",
  maiten: "#27ae60",
  peumo: "#c0784a",
  quillay: "#c0392b",
  // bosque sur
  coihue: "#2d5a1b",
  "nothofagus-nitida": "#1e5c12",
  barraco: "#9b59b6",
  // cactáceas
  "eulychnia-breviflora": "#d4a017",
  "eulychnia-castanea": "#b8860b",
  "pingo-pingo": "#a04000",
  quisco: "#e67e22",
  "quisco-coquimbano": "#d35400",
  "quisco-litoralis": "#f39c12",
  "quisco-skottsbergii": "#ca6f1e",
  quisquito: "#dc7633",
  // introducidas
  alamo: "#5d8aa8",
  manzano: "#e84393",
  olivo: "#808000",
  peral: "#b8b400",
  "platano-oriental": "#6b8cba",
  sauce: "#708090",
  otro: "#7f8c8d",
};

export function colorHospedero(h: Host): string {
  return COLORES[h];
}

export function etiquetaHospedero(h: Host): string {
  return ETIQUETAS[h];
}
```

- [ ] **Paso 4: Ejecutar tests — verificar que pasan**

```bash
npm test -- src/lib/__tests__/hosts.test.ts
```

Esperado: PASS (3 tests).

- [ ] **Paso 5: Commit**

```bash
git add src/lib/hosts.ts src/lib/__tests__/hosts.test.ts
git commit -m "feat: expandir HOSPEDEROS a 31 valores con etiquetas y colores"
```

---

### Tarea 3: Actualizar `identify.ts` y sus tests

**Archivos:**
- Modificar: `src/lib/identify.ts`
- Modificar: `src/lib/__tests__/identify.test.ts`

**Interfaces:**
- Consume: `Host`, `IdentifyOption`, `IdentifyResult` (Tarea 1); `HOSPEDEROS` (Tarea 2)
- Produce: `PROMPT_IDENTIFY: string`, `extractJson(text: string): unknown`, `parseIdentifyResult(raw: unknown): IdentifyResult`

- [ ] **Paso 1: Escribir los tests fallidos en `src/lib/__tests__/identify.test.ts`**

Reemplazar el contenido completo:

```typescript
import { describe, it, expect } from "vitest";
import { parseIdentifyResult } from "@/lib/identify";

describe("parseIdentifyResult", () => {
  it("acepta una respuesta válida con 2 opciones", () => {
    const r = parseIdentifyResult({
      esQuintral: true,
      opciones: [
        { hospedero: "quillay", confianza: 0.82 },
        { hospedero: "litre", confianza: 0.45 },
      ],
      fenologia: "en flor",
      notas: "hojas verdes",
    });
    expect(r).toEqual({
      esQuintral: true,
      opciones: [
        { hospedero: "quillay", confianza: 0.82 },
        { hospedero: "litre", confianza: 0.45 },
      ],
      fenologia: "en flor",
      notas: "hojas verdes",
    });
  });

  it("mapea hospedero desconocido a 'otro'", () => {
    const r = parseIdentifyResult({
      opciones: [
        { hospedero: "desconocido", confianza: 0.5 },
        { hospedero: "peumo", confianza: 0.3 },
      ],
    });
    expect(r.opciones[0].hospedero).toBe("otro");
    expect(r.opciones[1].hospedero).toBe("peumo");
  });

  it("recorta la confianza al rango 0..1 en cada opción", () => {
    const r = parseIdentifyResult({
      opciones: [
        { hospedero: "quillay", confianza: 5 },
        { hospedero: "litre", confianza: -2 },
      ],
    });
    expect(r.opciones[0].confianza).toBe(1);
    expect(r.opciones[1].confianza).toBe(0);
  });

  it("usa fallback seguro cuando faltan opciones", () => {
    const r = parseIdentifyResult({});
    expect(r.esQuintral).toBe(false);
    expect(r.opciones[0]).toEqual({ hospedero: "otro", confianza: 0 });
    expect(r.opciones[1]).toEqual({ hospedero: "otro", confianza: 0 });
    expect(r.fenologia).toBe("");
    expect(r.notas).toBe("");
  });

  it("no explota con entrada no-objeto", () => {
    expect(parseIdentifyResult(null).opciones[0].hospedero).toBe("otro");
    expect(parseIdentifyResult("texto").esQuintral).toBe(false);
  });
});
```

- [ ] **Paso 2: Ejecutar tests — verificar que fallan**

```bash
npm test -- src/lib/__tests__/identify.test.ts
```

Esperado: FAIL — `parseIdentifyResult` aún devuelve `hospederoProbable`.

- [ ] **Paso 3: Reemplazar el contenido completo de `src/lib/identify.ts`**

```typescript
import type { Host, IdentifyOption, IdentifyResult } from "@/lib/types";
import { HOSPEDEROS } from "@/lib/hosts";

export const PROMPT_IDENTIFY = `Eres un botánico experto en el matorral chileno y el bosque esclerófilo.

PASO 1 — Observación (texto libre, obligatorio antes del JSON):
Describe brevemente lo que observas en la imagen: tipo de corteza del árbol hospedero,
forma y color de sus hojas, hábitat visible. Si el hospedero no es visible o está muy
tapado por el quintral, dilo explícitamente.

PASO 2 — Responde SOLO con este JSON (sin texto adicional después):
{
  "esQuintral": boolean,
  "opciones": [
    { "hospedero": string, "confianza": number },
    { "hospedero": string, "confianza": number }
  ],
  "fenologia": string,
  "notas": string
}

Reglas estrictas:
- "hospedero" debe ser EXACTAMENTE uno de estos valores (sin variantes):
  alamo, aromo, arrayan, barraco, boldo, chacay, coihue, colliguay, corcolen, crucero,
  eulychnia-breviflora, eulychnia-castanea, huingan, litre, maqui, maiten, manzano,
  nothofagus-nitida, olivo, peral, peumo, pingo-pingo, platano-oriental, quillay,
  quisco, quisco-coquimbano, quisco-litoralis, quisco-skottsbergii, quisquito, sauce, otro
- "opciones" siempre tiene exactamente 2 entradas, ordenadas de mayor a menor confianza.
- Usa "otro" SOLO si el hospedero es genuinamente irreconocible. Una confianza baja
  (0.2–0.4) con nombre específico es preferible a "otro".
- "confianza" es un número entre 0 y 1.
- "notas" resume en una oración tu razonamiento del Paso 1.`;

function asObject(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function toHost(value: unknown): Host {
  return HOSPEDEROS.includes(value as Host) ? (value as Host) : "otro";
}

function toConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function toStr(value: unknown): string {
  return typeof value === "string" ? value : "";
}

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

const FALLBACK_OPTION: IdentifyOption = { hospedero: "otro", confianza: 0 };

function toIdentifyOption(raw: unknown): IdentifyOption {
  const o = asObject(raw);
  return {
    hospedero: toHost(o.hospedero),
    confianza: toConfidence(o.confianza),
  };
}

export function parseIdentifyResult(raw: unknown): IdentifyResult {
  const o = asObject(raw);
  const rawOpciones = Array.isArray(o.opciones) ? o.opciones : [];
  return {
    esQuintral: o.esQuintral === true,
    opciones: [
      rawOpciones[0] !== undefined ? toIdentifyOption(rawOpciones[0]) : FALLBACK_OPTION,
      rawOpciones[1] !== undefined ? toIdentifyOption(rawOpciones[1]) : FALLBACK_OPTION,
    ],
    fenologia: toStr(o.fenologia),
    notas: toStr(o.notas),
  };
}
```

- [ ] **Paso 4: Ejecutar tests — verificar que pasan**

```bash
npm test -- src/lib/__tests__/identify.test.ts
```

Esperado: PASS (5 tests).

- [ ] **Paso 5: Commit**

```bash
git add src/lib/identify.ts src/lib/__tests__/identify.test.ts
git commit -m "feat: prompt CoT botanico y parseIdentifyResult con 2 opciones"
```

---

### Tarea 4: Actualizar el test de la ruta API

**Archivos:**
- Modificar: `src/app/api/identify/__tests__/route.test.ts`

**Interfaces:**
- Consume: `IdentifyResult` con `opciones` (Tarea 1); `parseIdentifyResult` (Tarea 3)

- [ ] **Paso 1: Reemplazar el contenido completo de `src/app/api/identify/__tests__/route.test.ts`**

```typescript
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

  it("devuelve un IdentifyResult normalizado con 2 opciones", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: 'Observo corteza rojiza... {"esQuintral": true, "opciones": [{"hospedero": "quillay", "confianza": 0.9}, {"hospedero": "litre", "confianza": 0.5}], "fenologia": "en flor", "notas": "ok"}',
        },
      ],
    });
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.opciones[0].hospedero).toBe("quillay");
    expect(data.opciones[0].confianza).toBe(0.9);
    expect(data.opciones[1].hospedero).toBe("litre");
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

  it("400 si el mediaType no está en la lista permitida", async () => {
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "application/pdf" }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Paso 2: Ejecutar todos los tests para verificar que todo pasa**

```bash
npm test
```

Esperado: PASS en todos los archivos. Si hay errores de TypeScript en `IdentifySection.tsx` o `MapSection.tsx` (aún no actualizados), son esperados — los tests de lógica pura deben pasar.

- [ ] **Paso 3: Commit**

```bash
git add src/app/api/identify/__tests__/route.test.ts
git commit -m "test: actualizar mock y aserciones de ruta identify a nueva estructura"
```

---

### Tarea 5: Actualizar `IdentifySection.tsx`

**Archivos:**
- Modificar: `src/components/IdentifySection.tsx`

**Interfaces:**
- Consume: `IdentifyResult` con `opciones: [IdentifyOption, IdentifyOption]` (Tarea 1); `etiquetaHospedero` (Tarea 2)

- [ ] **Paso 1: Reemplazar el contenido completo de `src/components/IdentifySection.tsx`**

```typescript
"use client";
import { useState } from "react";
import type { IdentifyResult } from "@/lib/types";
import { etiquetaHospedero } from "@/lib/hosts";
import { fileToBase64 } from "@/lib/fileToBase64";
import { uploadFoto } from "@/lib/uploadFoto";
import type { Prefill } from "@/components/ContributeForm";

export default function IdentifySection({ onPrefill }: { onPrefill: (p: Prefill) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [resultado, setResultado] = useState<IdentifyResult | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegir(f: File | null) {
    setArchivo(f);
    setResultado(null);
    setFotoUrl(null);
    setError(null);
    setPrevia(f ? URL.createObjectURL(f) : null);
  }

  async function analizar() {
    if (!archivo) return;
    if (archivo.size > 4 * 1024 * 1024) {
      setError("La imagen es demasiado grande. Máximo 4 MB.");
      return;
    }
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
    onPrefill({
      ...(resultado
        ? {
            hospedero: resultado.opciones[0].hospedero,
            fenologia: resultado.fenologia,
            resultadoIa: resultado,
          }
        : {}),
      fotoUrl,
    });
    document.getElementById("aportar")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="identificar" className="section">
      <div className="section-head">
        <p className="kicker" data-num="01">Visión por computador</p>
        <h2>Identificación automática con IA</h2>
        <p>
          Sube una fotografía del ejemplar. El modelo estima especie, hospedero
          probable y fenología.
        </p>
      </div>

      <div className="identify-grid">
        {/* — Columna de subida — */}
        <div className="card card-pad">
          <label className="dropzone">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => elegir(e.target.files?.[0] ?? null)}
              hidden
            />
            {previa ? (
              <img src={previa} alt="Vista previa del ejemplar" className="dropzone-preview" />
            ) : (
              <span className="dropzone-empty">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true">
                  <path
                    d="M12 16V4m0 0L8 8m4-4 4 4M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <strong>Haz clic para subir una foto</strong>
                <small>JPG · PNG, hasta 4 MB</small>
              </span>
            )}
          </label>

          <p className="identify-hint">
            Para mejor identificación, enfoca las hojas y la corteza del árbol hospedero,
            no solo el quintral. Una foto cercana a las hojas es clave.
          </p>

          <div className="identify-actions">
            <span className="identify-meta">Modelo Quintral&nbsp;v0.2 (demo)</span>
            <div className="identify-buttons">
              {archivo && (
                <button type="button" className="btn btn--ghost" onClick={() => elegir(null)}>
                  Limpiar
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary"
                onClick={analizar}
                disabled={!archivo || cargando}
              >
                {cargando ? "Analizando…" : "Analizar"}
              </button>
            </div>
          </div>
        </div>

        {/* — Columna de resultado — */}
        <div className="card card-pad result">
          <h3 className="result-title">Resultado del análisis</h3>
          {error && <p className="alert alert--error">{error}</p>}

          {!resultado && !error && (
            <p className="result-empty">
              Sube una imagen para evaluar el ejemplar y obtener los hospederos
              más probables, la confianza del modelo y notas de campo.
            </p>
          )}

          {resultado && (
            <>
              <div className="result-verdict">
                <span className={`badge ${resultado.esQuintral ? "badge--yes" : "badge--maybe"}`}>
                  {resultado.esQuintral ? "Es quintral" : "Sin certeza"}
                </span>
              </div>

              <div className="result-options">
                <p className="result-options-label">Hospederos más probables</p>
                {resultado.opciones.map((op, i) => {
                  const pct = Math.round(op.confianza * 100);
                  return (
                    <div key={op.hospedero + i} className="result-option">
                      <div className="result-conf-head">
                        <span>
                          <strong>{i + 1}º</strong> {etiquetaHospedero(op.hospedero)}
                        </span>
                        <strong>{pct}%</strong>
                      </div>
                      <div
                        className="meter"
                        role="meter"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span style={{ transform: `scaleX(${op.confianza})` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <dl className="result-data">
                <div>
                  <dt>Fenología</dt>
                  <dd>{resultado.fenologia || "—"}</dd>
                </div>
                <div>
                  <dt>Notas</dt>
                  <dd>{resultado.notas || "—"}</dd>
                </div>
              </dl>

              {resultado.opciones[0].confianza < 0.4 && (
                <p className="alert alert--error">
                  Baja confianza: confirma el hospedero a mano en el formulario.
                </p>
              )}
            </>
          )}

          {(resultado || fotoUrl) && (
            <button type="button" className="btn btn--forest result-cta" onClick={agregarAlMapa}>
              {resultado ? "Agregar al mapa" : "Agregar foto al mapa manualmente"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Paso 2: Verificar que TypeScript no tiene errores en este archivo**

```bash
npx tsc --noEmit
```

Esperado: sin errores en `IdentifySection.tsx`. Puede quedar error en `MapSection.tsx` (próxima tarea).

- [ ] **Paso 3: Commit**

```bash
git add src/components/IdentifySection.tsx
git commit -m "feat: UI identificador con 2 opciones, guia de foto y umbral corregido"
```

---

### Tarea 6: Filtro dinámico en `MapSection.tsx`

**Archivos:**
- Modificar: `src/components/MapSection.tsx`

**Interfaces:**
- Consume: `Observation.hospedero: Host` (Tarea 1); `colorHospedero`, `etiquetaHospedero` (Tarea 2)

- [ ] **Paso 1: Aplicar cambios en `src/components/MapSection.tsx`**

Reemplazar en el archivo las siguientes partes:

**Eliminar** el import de `HOSPEDEROS` de la línea 5:
```typescript
// Antes:
import { HOSPEDEROS, etiquetaHospedero, colorHospedero } from "@/lib/hosts";

// Después:
import { etiquetaHospedero, colorHospedero } from "@/lib/hosts";
```

**Agregar** un `useMemo` para hospederos con datos (justo después del useMemo de `cerros`, línea ~15):
```typescript
const hospederosConDatos = useMemo(
  () => Array.from(new Set(observations.map((o) => o.hospedero))),
  [observations],
);
```

**Reemplazar** el map del filtro de hospederos (~línea 72):
```typescript
// Antes:
{HOSPEDEROS.map((h) => (

// Después:
{hospederosConDatos.map((h) => (
```

- [ ] **Paso 2: Ejecutar todos los tests y verificar TypeScript**

```bash
npm test && npx tsc --noEmit
```

Esperado: PASS en todos los tests, 0 errores de TypeScript.

- [ ] **Paso 3: Commit final**

```bash
git add src/components/MapSection.tsx
git commit -m "feat: filtro de hospedero en mapa derivado de observaciones reales"
```

---

## Auto-revisión contra el spec

| Requisito del spec | Tarea |
|---|---|
| `Host` × 31 valores | Tarea 1 |
| `IdentifyOption` e `IdentifyResult` con `opciones` | Tarea 1 |
| `HOSPEDEROS`, `ETIQUETAS`, `COLORES` × 31 | Tarea 2 |
| `etiquetaHospedero` con mapa de etiquetas | Tarea 2 |
| Prompt con CoT botánico + lista de 31 hospederos | Tarea 3 |
| `parseIdentifyResult` con fallback seguro | Tarea 3 |
| Tests de `identify.ts` actualizados | Tarea 3 |
| Tests de ruta API actualizados | Tarea 4 |
| Guía de fotografía en UI | Tarea 5 |
| 2 barras de confianza en resultado | Tarea 5 |
| Umbral de alerta en 0.4 | Tarea 5 |
| Prefill usa `opciones[0].hospedero` | Tarea 5 |
| Filtro mapa dinámico | Tarea 6 |
