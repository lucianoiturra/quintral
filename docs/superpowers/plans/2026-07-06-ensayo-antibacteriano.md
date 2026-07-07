# Ensayo antibacteriano (fase 2026) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar a la home una sección "Ensayo antibacteriano (2026)" que reconstruye las curvas OD del extracto de quintral (litre vs quillay) contra tres bacterias como gráfico nativo SVG interactivo, más fotos de antibiograma como evidencia, con tono honesto y lugar reservado para bacterias marinas.

**Architecture:** Datos estáticos en `src/lib/antibacteriano.ts` (análogo a `fitoquimica.ts`). Un componente de gráfico SVG nuevo `OdChart.tsx` (barras agrupadas + tooltip por hover/foco). Una sección cliente `AntibacterianoSection.tsx` con selector por bacteria (estado local) que compone datos + gráfico + fotos. Integración en `HomeClient.tsx` y `Nav.tsx`. Sin red, sin backend.

**Tech Stack:** Next.js (App Router), React, TypeScript, SVG inline, vitest + @testing-library/react. Tokens y clases CSS existentes en `src/app/globals.css`.

## Global Constraints

- Idioma de toda la UI y textos: **español**.
- Ningún dato inventado: los valores OD se declaran como **medias leídas de las figuras del informe 2026 (aproximadas, sin SD)** vía `NOTA_DATOS`. Las fotos de antibiograma NO se reconstruyen.
- Tono honesto: el extracto **no** inhibió el crecimiento en microdilución; la ampicilina (C+) sí. No afirmar que el quintral es un antibiótico potente.
- Reutilizar tokens/clases existentes (`section`, `section-head`, `kicker`, `card`, `card-pad`, `chart-grid`, `chart-legend`, `legend-dot`, `data-source`, `alert alert--ok`, `result-title`, `result-empty`, `bar-grid`, `bar-tick`, `bar-cat`). Colores: `--quintral` (litre), `--forest-bright` (quillay).
- Tests con vitest: `npm test` (= `vitest run`). Los tests viven en `src/**/__tests__/`.
- Commits frecuentes, uno por tarea. Terminar cada mensaje de commit con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

- Create: `src/lib/antibacteriano.ts` — datos del ensayo + helpers (Task 1).
- Create: `src/lib/__tests__/antibacteriano.test.ts` — tests de datos (Task 1).
- Create: `public/figuras/antibacteriano/*.jpg` — fotos de antibiograma (Task 2).
- Create: `src/components/OdChart.tsx` — gráfico SVG de barras agrupadas (Task 3).
- Create: `src/components/__tests__/OdChart.test.tsx` — test del gráfico (Task 3).
- Create: `src/components/AntibacterianoSection.tsx` — sección con selector (Task 4).
- Create: `src/components/__tests__/AntibacterianoSection.test.tsx` — test de sección (Task 4).
- Modify: `src/app/globals.css` — clases nuevas (`.od-chart`, `.od-bar`, `.od-tip`, `.tabs`, `.tab`, `.antibiograma-grid`, `.card--muted`) (Tasks 3 y 4).
- Modify: `src/components/HomeClient.tsx` — insertar `<AntibacterianoSection />` (Task 5).
- Modify: `src/components/Nav.tsx` — enlace y sección observada (Task 5).

---

### Task 1: Módulo de datos `antibacteriano.ts`

**Files:**
- Create: `src/lib/antibacteriano.ts`
- Test: `src/lib/__tests__/antibacteriano.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - Tipos: `Hospedero = "litre" | "quillay"`, `BacteriaId = "e-coli" | "s-aureus" | "e-faecalis"`, `Bacteria`, `PuntoOD`, `CurvaOD`, `FiguraAntibiograma`.
  - Constantes: `CONCENTRACIONES: number[]`, `BACTERIAS: Bacteria[]`, `CURVAS: CurvaOD[]`, `ANTIBIOGRAMAS: FiguraAntibiograma[]`, `NOTA_DATOS: string`.
  - Funciones: `bacteria(id: BacteriaId): Bacteria`, `curvasDeBacteria(id: BacteriaId): CurvaOD[]`, `antibiogramasDeBacteria(id: BacteriaId): FiguraAntibiograma[]`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/antibacteriano.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  BACTERIAS,
  CONCENTRACIONES,
  CURVAS,
  ANTIBIOGRAMAS,
  bacteria,
  curvasDeBacteria,
  antibiogramasDeBacteria,
} from "@/lib/antibacteriano";

describe("antibacteriano", () => {
  it("define las tres bacterias con cepa y gram", () => {
    expect(BACTERIAS.map((b) => b.id)).toEqual([
      "e-coli",
      "s-aureus",
      "e-faecalis",
    ]);
    expect(bacteria("e-coli").cepa).toBe("ATCC 25922");
    expect(bacteria("s-aureus").gram).toBe("positiva");
  });

  it("bacteria() lanza ante un id desconocido", () => {
    // @ts-expect-error id inválido a propósito
    expect(() => bacteria("marina")).toThrow();
  });

  it("tiene 6 curvas (3 bacterias x 2 hospederos) con 5 concentraciones", () => {
    expect(CURVAS).toHaveLength(6);
    expect(CONCENTRACIONES).toEqual([0, 128, 256, 512, 1024]);
    for (const c of CURVAS) {
      expect(c.puntos.map((p) => p.concentracion)).toEqual(CONCENTRACIONES);
      expect(typeof c.controlPos).toBe("number");
      expect(typeof c.controlNeg).toBe("number");
    }
  });

  it("curvasDeBacteria devuelve litre y quillay", () => {
    const cs = curvasDeBacteria("e-coli");
    expect(cs.map((c) => c.hospedero).sort()).toEqual(["litre", "quillay"]);
    const litre = cs.find((c) => c.hospedero === "litre")!;
    expect(litre.puntos[4].od).toBe(0.69); // E. coli litre @1024
  });

  it("incluye las fotos de antibiograma confirmadas", () => {
    const archivos = ANTIBIOGRAMAS.map((a) => a.archivo);
    expect(archivos).toContain(
      "/figuras/antibacteriano/antibiograma-e-coli-ampicilina.jpg",
    );
    expect(antibiogramasDeBacteria("s-aureus").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/antibacteriano.test.ts`
Expected: FAIL — no puede resolver `@/lib/antibacteriano`.

- [ ] **Step 3: Write the data module**

Create `src/lib/antibacteriano.ts`:

```ts
export type Hospedero = "litre" | "quillay";
export type BacteriaId = "e-coli" | "s-aureus" | "e-faecalis";

export interface Bacteria {
  id: BacteriaId;
  nombre: string; // nombre científico
  cepa: string; // "ATCC 25922"
  gram: "positiva" | "negativa";
}

export interface PuntoOD {
  concentracion: number; // µg/mL de extracto (0 = control de crecimiento)
  od: number; // absorbancia a 600 nm (media leída de figura)
}

export interface CurvaOD {
  bacteria: BacteriaId;
  hospedero: Hospedero;
  puntos: PuntoOD[];
  controlPos: number; // C+ ampicilina
  controlNeg: number; // C- solo medio
}

export interface FiguraAntibiograma {
  bacteria: BacteriaId;
  hospedero: Hospedero | "ampicilina"; // ampicilina = placa control
  archivo: string; // ruta pública
  pie: string;
}

export const CONCENTRACIONES = [0, 128, 256, 512, 1024];

export const BACTERIAS: Bacteria[] = [
  { id: "e-coli", nombre: "Escherichia coli", cepa: "ATCC 25922", gram: "negativa" },
  { id: "s-aureus", nombre: "Staphylococcus aureus", cepa: "ATCC 25923", gram: "positiva" },
  { id: "e-faecalis", nombre: "Enterococcus faecalis", cepa: "ATCC 29212", gram: "positiva" },
];

function curva(
  bacteria: BacteriaId,
  hospedero: Hospedero,
  ods: number[],
  controlPos: number,
  controlNeg: number,
): CurvaOD {
  return {
    bacteria,
    hospedero,
    puntos: CONCENTRACIONES.map((concentracion, i) => ({
      concentracion,
      od: ods[i],
    })),
    controlPos,
    controlNeg,
  };
}

// Medias de OD (600 nm) leídas de las figuras del informe 2026.
export const CURVAS: CurvaOD[] = [
  curva("e-coli", "litre", [0.5, 0.62, 0.51, 0.53, 0.69], 0.06, 0.06),
  curva("e-coli", "quillay", [0.61, 0.55, 0.54, 0.52, 0.66], 0.06, 0.05),
  curva("s-aureus", "litre", [0.36, 0.34, 0.37, 0.46, 0.4], 0.07, 0.06),
  curva("s-aureus", "quillay", [0.25, 0.29, 0.32, 0.31, 0.31], 0.075, 0.065),
  curva("e-faecalis", "litre", [0.14, 0.19, 0.16, 0.185, 0.25], 0.063, 0.059),
  curva("e-faecalis", "quillay", [0.125, 0.173, 0.148, 0.174, 0.199], 0.063, 0.059),
];

export const ANTIBIOGRAMAS: FiguraAntibiograma[] = [
  {
    bacteria: "e-coli",
    hospedero: "ampicilina",
    archivo: "/figuras/antibacteriano/antibiograma-e-coli-ampicilina.jpg",
    pie: "E. coli con discos de ampicilina (control +): halos de inhibición amplios.",
  },
  {
    bacteria: "e-coli",
    hospedero: "litre",
    archivo: "/figuras/antibacteriano/antibiograma-e-coli-litre.jpg",
    pie: "E. coli con discos de extracto de litre (1024 µg): sin halo apreciable.",
  },
  {
    bacteria: "s-aureus",
    hospedero: "quillay",
    archivo: "/figuras/antibacteriano/antibiograma-s-aureus-quillay.jpg",
    pie: "S. aureus con discos de extracto de quillay (1024 µg): halo leve alrededor de un disco.",
  },
  {
    bacteria: "e-faecalis",
    hospedero: "litre",
    archivo: "/figuras/antibacteriano/antibiograma-e-faecalis-litre.jpg",
    pie: "E. faecalis con discos de extracto de litre (1024 µg): sin halo apreciable.",
  },
];

export const NOTA_DATOS =
  "Medias de OD (600 nm) leídas de las figuras del informe 2026 " +
  "(aproximadas, sin desviación estándar). Ensayos por triplicado. " +
  "C+ = ampicilina, C− = solo medio de cultivo.";

export function bacteria(id: BacteriaId): Bacteria {
  const b = BACTERIAS.find((x) => x.id === id);
  if (!b) throw new Error(`Bacteria desconocida: ${id}`);
  return b;
}

export function curvasDeBacteria(id: BacteriaId): CurvaOD[] {
  return CURVAS.filter((c) => c.bacteria === id);
}

export function antibiogramasDeBacteria(id: BacteriaId): FiguraAntibiograma[] {
  return ANTIBIOGRAMAS.filter((a) => a.bacteria === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/antibacteriano.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/antibacteriano.ts src/lib/__tests__/antibacteriano.test.ts
git commit -m "feat: datos del ensayo antibacteriano (curvas OD + antibiogramas)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Extraer las fotos de antibiograma del PDF a `public/`

**Files:**
- Create: `public/figuras/antibacteriano/antibiograma-e-coli-ampicilina.jpg`
- Create: `public/figuras/antibacteriano/antibiograma-e-coli-litre.jpg`
- Create: `public/figuras/antibacteriano/antibiograma-s-aureus-quillay.jpg`
- Create: `public/figuras/antibacteriano/antibiograma-e-faecalis-litre.jpg`

**Interfaces:**
- Consumes: nada (usa el PDF local `Documentación/Informe Proyecto Quintral.pdf`, que NO está versionado).
- Produces: los 4 archivos que `ANTIBIOGRAMAS` (Task 1) referencia.

Contexto: el PDF contiene 21 imágenes JPEG embebidas (6 son gráficos OD que NO se usan; el resto son microplacas y placas de antibiograma). Los índices de extracción son estables (barrido secuencial del archivo). Índices confirmados abriendo cada imagen y leyendo la etiqueta manuscrita de la placa:
- `img_16` → E. coli + ampicilina (halos grandes) → `antibiograma-e-coli-ampicilina.jpg`
- `img_15` → E. coli + litre ("E. coli L1") → `antibiograma-e-coli-litre.jpg`
- `img_18` → S. aureus + quillay ("S. aureus Q3") → `antibiograma-s-aureus-quillay.jpg`
- `img_13` → E. faecalis + litre ("E. faecalis L1") → `antibiograma-e-faecalis-litre.jpg`

- [ ] **Step 1: Crear el script de extracción**

Create el script en el scratchpad (NO se versiona) `scripts-tmp/extract-antibiogramas.js` o en el directorio scratchpad de la sesión:

```js
const fs = require("fs");
const path = require("path");
const PDF = process.argv[2]; // ruta al Informe Proyecto Quintral.pdf
const OUT = process.argv[3]; // public/figuras/antibacteriano
const s = fs.readFileSync(PDF);
const jpegs = [];
let i = 0;
while ((i = s.indexOf("DCTDecode", i)) !== -1) {
  const st = s.indexOf("stream", i);
  if (st === -1) break;
  let p = st + 6;
  if (s[p] === 0x0d) p++;
  if (s[p] === 0x0a) p++;
  const end = s.indexOf("endstream", p);
  const data = s.slice(p, end);
  if (data[0] === 0xff && data[1] === 0xd8) jpegs.push(data);
  i = end + 9;
}
const MAP = {
  16: "antibiograma-e-coli-ampicilina.jpg",
  15: "antibiograma-e-coli-litre.jpg",
  18: "antibiograma-s-aureus-quillay.jpg",
  13: "antibiograma-e-faecalis-litre.jpg",
};
fs.mkdirSync(OUT, { recursive: true });
for (const [idx, name] of Object.entries(MAP)) {
  fs.writeFileSync(path.join(OUT, name), jpegs[Number(idx)]);
  console.log("escrito", name, jpegs[Number(idx)].length, "bytes");
}
console.log("total jpegs en PDF:", jpegs.length);
```

- [ ] **Step 2: Ejecutar el script**

Run (ajustar la ruta del PDF si difiere):

```bash
node <ruta-scratchpad>/extract-antibiogramas.js \
  "Documentación/Informe Proyecto Quintral.pdf" \
  "public/figuras/antibacteriano"
```

Expected: imprime `total jpegs en PDF: 21` y "escrito" para los 4 archivos.

- [ ] **Step 3: Verificar visualmente cada imagen**

Abrir los 4 archivos generados y confirmar que la etiqueta manuscrita coincide con el nombre (E. coli Amp / E. coli L1 / S. aureus Q3 / E. faecalis L1). Si algún índice no coincide (el PDF cambió), abrir las 21 imágenes extraídas y corregir el `MAP`. No continuar hasta que los 4 coincidan.

- [ ] **Step 4: Commit (solo las imágenes)**

```bash
git add public/figuras/antibacteriano/
git commit -m "assets: fotos de antibiograma del informe 2026

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Componente de gráfico `OdChart.tsx`

**Files:**
- Create: `src/components/OdChart.tsx`
- Test: `src/components/__tests__/OdChart.test.tsx`
- Modify: `src/app/globals.css` (agregar clases del gráfico)

**Interfaces:**
- Consumes: nada (componente presentacional puro).
- Produces:
  - `export interface SerieOD { nombre: string; color: string; valores: number[]; }`
  - `export default function OdChart(props: OdChartProps)` con
    `OdChartProps = { categorias: string[]; series: SerieOD[]; maxY: number; size?: { w: number; h: number } }`.
  - Renderiza un `<svg role="img">` con una `<rect class="od-bar">` por (categoría × serie).

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/OdChart.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OdChart from "@/components/OdChart";

describe("OdChart", () => {
  it("dibuja una barra por (categoría × serie) y resume los datos en aria-label", () => {
    const { container } = render(
      <OdChart
        categorias={["0", "1024"]}
        series={[
          { nombre: "Litre", color: "#a00", valores: [0.5, 0.69] },
          { nombre: "Quillay", color: "#0a0", valores: [0.61, 0.66] },
        ]}
        maxY={0.8}
      />,
    );
    expect(container.querySelectorAll("rect.od-bar")).toHaveLength(4);
    const svg = screen.getByRole("img");
    const label = svg.getAttribute("aria-label") ?? "";
    expect(label).toContain("Litre");
    expect(label).toContain("0.69");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/OdChart.test.tsx`
Expected: FAIL — no puede resolver `@/components/OdChart`.

- [ ] **Step 3: Write the component**

Create `src/components/OdChart.tsx`:

```tsx
"use client";
import { useState } from "react";

export interface SerieOD {
  nombre: string;
  color: string;
  valores: number[]; // uno por categoría
}

export interface OdChartProps {
  categorias: string[];
  series: SerieOD[];
  maxY: number;
  size?: { w: number; h: number };
}

export default function OdChart({
  categorias,
  series,
  maxY,
  size = { w: 520, h: 320 },
}: OdChartProps) {
  const { w, h } = size;
  const padL = 44;
  const padR = 16;
  const padT = 20;
  const padB = 44;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const [hover, setHover] = useState<{ cat: number; serie: number } | null>(null);

  const grupoW = plotW / categorias.length;
  const barW = (grupoW * 0.7) / series.length;
  const yDe = (v: number) => padT + plotH * (1 - v / maxY);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => +(f * maxY).toFixed(2));

  const resumen = series
    .map(
      (s) =>
        `${s.nombre}: ${s.valores
          .map((v, i) => `${categorias[i]} ${v}`)
          .join(", ")}`,
    )
    .join(". ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="od-chart"
      role="img"
      aria-label={`Gráfico OD 600 nm. ${resumen}`}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={yDe(t)} x2={w - padR} y2={yDe(t)} className="bar-grid" />
          <text
            x={padL - 8}
            y={yDe(t)}
            className="bar-tick"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {t}
          </text>
        </g>
      ))}

      {categorias.map((cat, ci) => {
        const gx = padL + ci * grupoW;
        return (
          <g key={cat}>
            {series.map((s, si) => {
              const v = s.valores[ci];
              const x = gx + grupoW * 0.15 + si * barW;
              const y = yDe(v);
              const bh = plotH * (v / maxY);
              const activo = hover?.cat === ci && hover?.serie === si;
              return (
                <rect
                  key={s.nombre}
                  x={x}
                  y={y}
                  width={barW}
                  height={bh}
                  rx={3}
                  fill={s.color}
                  className="od-bar"
                  tabIndex={0}
                  opacity={hover && !activo ? 0.45 : 1}
                  onMouseEnter={() => setHover({ cat: ci, serie: si })}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover({ cat: ci, serie: si })}
                  onBlur={() => setHover(null)}
                >
                  <title>{`${s.nombre} · ${cat}: ${v} OD`}</title>
                </rect>
              );
            })}
            <text
              x={gx + grupoW / 2}
              y={h - padB + 16}
              className="bar-cat"
              textAnchor="middle"
            >
              {cat}
            </text>
          </g>
        );
      })}

      {hover &&
        (() => {
          const s = series[hover.serie];
          const v = s.valores[hover.cat];
          const cx = padL + hover.cat * grupoW + grupoW / 2;
          const ty = Math.max(yDe(v) - 10, padT + 10);
          return (
            <text x={cx} y={ty} className="od-tip" textAnchor="middle">
              {`${s.nombre}: ${v}`}
            </text>
          );
        })()}
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/OdChart.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add chart CSS**

En `src/app/globals.css`, después del bloque `.bar-value { ... }` (cerca de la línea 1340), agregar:

```css
.od-chart {
  width: 100%;
  height: auto;
  display: block;
}

.od-bar {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.od-bar:focus-visible {
  outline: 2px solid var(--forest-bright);
  outline-offset: 2px;
}

.od-tip {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  fill: var(--ink);
  paint-order: stroke;
  stroke: var(--surface, #fff);
  stroke-width: 3px;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/OdChart.tsx src/components/__tests__/OdChart.test.tsx src/app/globals.css
git commit -m "feat: OdChart, gráfico SVG de barras agrupadas con tooltip

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Sección `AntibacterianoSection.tsx`

**Files:**
- Create: `src/components/AntibacterianoSection.tsx`
- Test: `src/components/__tests__/AntibacterianoSection.test.tsx`
- Modify: `src/app/globals.css` (clases `.tabs`, `.tab`, `.antibiograma-grid`, `.card--muted`)

**Interfaces:**
- Consumes: de `@/lib/antibacteriano` — `BACTERIAS`, `CONCENTRACIONES`, `curvasDeBacteria`, `antibiogramasDeBacteria`, `bacteria`, `NOTA_DATOS`, tipos `BacteriaId`, `Hospedero`. De `@/components/OdChart` — `OdChart`, `SerieOD`.
- Produces: `export default function AntibacterianoSection()` — `<section id="antibacteriano">`.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/AntibacterianoSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AntibacterianoSection from "@/components/AntibacterianoSection";

describe("AntibacterianoSection", () => {
  it("muestra E. coli por defecto y cambia al elegir otra bacteria", () => {
    render(<AntibacterianoSection />);
    expect(
      screen.getByRole("heading", { name: /Actividad antibacteriana/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Escherichia coli/).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("tab", { name: /Staphylococcus aureus/ }),
    );
    expect(screen.getAllByText(/Staphylococcus aureus/).length).toBeGreaterThan(0);
  });

  it("declara que los datos son leídos de figura y reserva lugar para bacterias marinas", () => {
    render(<AntibacterianoSection />);
    expect(screen.getByText(/leídas de las figuras/)).toBeInTheDocument();
    expect(screen.getByText(/Bacterias marinas/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/AntibacterianoSection.test.tsx`
Expected: FAIL — no puede resolver `@/components/AntibacterianoSection`.

- [ ] **Step 3: Write the component**

Create `src/components/AntibacterianoSection.tsx`:

```tsx
"use client";
import { useState } from "react";
import OdChart, { type SerieOD } from "@/components/OdChart";
import {
  BACTERIAS,
  CONCENTRACIONES,
  curvasDeBacteria,
  antibiogramasDeBacteria,
  bacteria as getBacteria,
  NOTA_DATOS,
  type BacteriaId,
  type Hospedero,
} from "@/lib/antibacteriano";

const COLOR_HOSPEDERO: Record<Hospedero, string> = {
  litre: "var(--quintral)",
  quillay: "var(--forest-bright)",
};
const NOMBRE_HOSPEDERO: Record<Hospedero, string> = {
  litre: "Litre",
  quillay: "Quillay",
};
const CATEGORIAS = [...CONCENTRACIONES.map(String), "C+", "C−"];

export default function AntibacterianoSection() {
  const [activa, setActiva] = useState<BacteriaId>("e-coli");
  const b = getBacteria(activa);
  const curvas = curvasDeBacteria(activa);
  const antibiogramas = antibiogramasDeBacteria(activa);

  const series: SerieOD[] = curvas.map((c) => ({
    nombre: NOMBRE_HOSPEDERO[c.hospedero],
    color: COLOR_HOSPEDERO[c.hospedero],
    valores: [...c.puntos.map((p) => p.od), c.controlPos, c.controlNeg],
  }));
  const maxOd = Math.max(...series.flatMap((s) => s.valores));
  const maxY = Math.ceil((maxOd * 1.15) / 0.1) * 0.1;

  return (
    <section id="antibacteriano" className="section">
      <div className="section-head">
        <p className="kicker" data-num="05">
          Ensayo antibacteriano
        </p>
        <h2>Actividad antibacteriana del extracto de quintral (2026)</h2>
        <p>
          Extractos etanólicos de quintral obtenidos desde litre y quillay,
          enfrentados a tres bacterias de referencia por microdilución (OD a
          600 nm) y antibiograma. Más OD = más crecimiento = menos inhibición.
        </p>
      </div>

      <div className="tabs" role="tablist" aria-label="Bacteria del ensayo">
        {BACTERIAS.map((bac) => (
          <button
            key={bac.id}
            type="button"
            role="tab"
            aria-selected={bac.id === activa}
            className={`tab${bac.id === activa ? " tab--active" : ""}`}
            onClick={() => setActiva(bac.id)}
          >
            <em>{bac.nombre}</em> {bac.cepa}
          </button>
        ))}
      </div>

      <div className="chart-grid">
        <div className="card card-pad">
          <h3 className="result-title">
            <em>{b.nombre}</em> {b.cepa} · Gram {b.gram}
          </h3>
          <OdChart categorias={CATEGORIAS} series={series} maxY={maxY} />
          <ul className="chart-legend">
            {series.map((s) => (
              <li key={s.nombre}>
                <span className="legend-dot" style={{ background: s.color }} />
                {s.nombre}
              </li>
            ))}
          </ul>
          <p className="data-source">
            Eje X: µg/mL de extracto (0 = control de crecimiento). C+ =
            ampicilina, C− = solo medio.
          </p>
        </div>

        <div className="card card-pad">
          <h3 className="result-title">Antibiograma (halo de inhibición)</h3>
          {antibiogramas.length === 0 ? (
            <p className="result-empty">
              Sin foto de antibiograma para esta bacteria.
            </p>
          ) : (
            <div className="antibiograma-grid">
              {antibiogramas.map((f) => (
                <figure key={f.archivo} className="antibiograma-fig">
                  <img
                    src={f.archivo}
                    alt={f.pie}
                    loading="lazy"
                    onError={(e) => {
                      const fig = e.currentTarget.closest("figure");
                      if (fig) (fig as HTMLElement).style.display = "none";
                    }}
                  />
                  <figcaption>{f.pie}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <p className="alert alert--ok chart-note">{NOTA_DATOS}</p>
        </div>
      </div>

      <p className="alert alert--ok chart-note antibacteriano-lectura">
        Lectura honesta: en todos los casos el extracto (128–1024 µg/mL) mantuvo
        el crecimiento similar al control sin extracto, mientras que la
        ampicilina (C+) sí lo inhibió. En medio líquido el extracto de quintral
        no mostró actividad antibacteriana apreciable; en antibiograma se
        observó un halo menor para algunas combinaciones. Resultado experimental
        propio 2026.
      </p>

      <div className="card card-pad card--muted antibacteriano-marinas">
        <h3 className="result-title">Bacterias marinas — ensayo en curso</h3>
        <p className="result-empty">
          Estamos evaluando el extracto de quintral contra bacterias marinas.
          Los resultados se sumarán a esta sección cuando estén disponibles.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/AntibacterianoSection.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Add section CSS**

En `src/app/globals.css`, después del bloque `.predecir-form { ... }` (cerca de la línea 1346), agregar:

```css
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tab {
  border: 1px solid var(--line-soft);
  background: transparent;
  color: var(--ink-faint);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.tab em {
  font-style: italic;
}

.tab:hover {
  border-color: var(--forest-bright);
  color: var(--ink);
}

.tab--active {
  background: var(--forest);
  border-color: var(--forest);
  color: #fff;
}

.antibiograma-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin: 0.5rem 0 1rem;
}

.antibiograma-fig {
  margin: 0;
}

.antibiograma-fig img {
  width: 100%;
  border-radius: 8px;
  display: block;
}

.antibiograma-fig figcaption {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.antibacteriano-lectura {
  margin-top: 1.5rem;
}

.card--muted {
  margin-top: 1.5rem;
  opacity: 0.75;
  border-style: dashed;
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS (todos los tests, incluidos los previos).

- [ ] **Step 7: Commit**

```bash
git add src/components/AntibacterianoSection.tsx src/components/__tests__/AntibacterianoSection.test.tsx src/app/globals.css
git commit -m "feat: sección de ensayo antibacteriano con selector por bacteria

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Integrar en la home y el Nav

**Files:**
- Modify: `src/components/HomeClient.tsx`
- Modify: `src/components/Nav.tsx`

**Interfaces:**
- Consumes: `AntibacterianoSection` (Task 4).
- Produces: la sección visible en la home y navegable desde el menú.

- [ ] **Step 1: Insertar la sección en HomeClient**

En `src/components/HomeClient.tsx`, agregar el import junto a los otros componentes:

```tsx
import AntibacterianoSection from "@/components/AntibacterianoSection";
```

Y en el JSX, insertarla entre `<PrediccionSection />` y `<FaqSection />`:

```tsx
      <PrediccionSection />
      <AntibacterianoSection />
      <FaqSection />
```

- [ ] **Step 2: Registrar la sección en el Nav**

En `src/components/Nav.tsx`, línea 5, agregar `"antibacteriano"` a `SECTIONS` entre `"predecir"` y `"preguntas"`:

```tsx
const SECTIONS = ["identificar", "mapa", "comparar", "predecir", "antibacteriano", "preguntas", "aportar"] as const;
```

Y en el menú (cerca de la línea 82), agregar el enlace entre Predicción y Preguntas:

```tsx
          {link("#predecir", "Predicción")}
          {link("#antibacteriano", "Antibacteriano")}
          {link("#preguntas", "Preguntas")}
```

- [ ] **Step 3: Verificar build y tests**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: build exitoso sin errores de TypeScript.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`, abrir http://localhost:3000, bajar hasta "Ensayo antibacteriano". Confirmar:
- El gráfico muestra litre vs quillay por concentración + C+/C−.
- Al pasar el mouse/enfocar con Tab una barra, aparece el tooltip con el valor.
- El selector de bacteria cambia gráfico, título, fotos y valores.
- Las 4 fotos de antibiograma cargan.
- El enlace "Antibacteriano" del menú lleva a la sección y se resalta al hacer scroll.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomeClient.tsx src/components/Nav.tsx
git commit -m "feat: enlazar la sección de ensayo antibacteriano en home y nav

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notas de cierre

- Antes de publicar, el usuario debe validar los valores OD digitalizados y los textos contra el informe completo (las conclusiones del informe no estaban en el texto extraído del PDF).
- Ampliar a bacterias marinas = agregar entradas a `BACTERIAS`, `CURVAS` y `ANTIBIOGRAMAS`, y reemplazar la tarjeta `card--muted`. Ningún cambio estructural.
