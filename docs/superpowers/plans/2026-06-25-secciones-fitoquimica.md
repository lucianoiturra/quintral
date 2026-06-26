# Secciones de fitoquímica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir las dos secciones de la fase 2 ("Comparar compuestos entre hospederos" con radar, y "Predicción fitoquímica del ejemplar" con formulario + barras) usando solo datos reales del laboratorio 2025, con procedencia explícita y sin valores inventados.

**Architecture:** Una capa de datos tipada (`fitoquimica.ts`) como única fuente de verdad; dos componentes de gráfico SVG genéricos y sin dependencias (`RadarChart`, `BarChart`); dos componentes de sección (`CompararSection`, `PrediccionSection`) que consumen la capa de datos y se montan en `HomeClient`. Estilos en `globals.css` siguiendo los tokens existentes.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest + Testing Library (jsdom). SVG propio para gráficos — sin librería de charting.

## Global Constraints

- **Sin dependencias nuevas**: gráficos en SVG propio (no recharts/chart.js).
- **Honestidad de datos**: ningún valor inventado. `null` = "n/d" (no determinado) y se rotula visiblemente; nunca se rellena ni oculta.
- **Datos reales (informe laboratorio 2025, base seca)**: Muestra 1 (S-218-25) → polifenoles 52,8 mg EAG/g, flavonoides 50,0 mg QE/g, antocianinas n/d. Muestra 2 (S-219-25) → polifenoles 52,8, flavonoides 49,5, antocianinas n/d.
- **Accesibilidad WCAG AA**: cada gráfico lleva `role="img"` + `aria-label` y una tabla/equivalente textual; no depender solo del color (leyenda con etiqueta); respetar `prefers-reduced-motion` (ya cubierto globalmente en `globals.css`).
- **Estilo**: reutilizar clases existentes (`.section`, `.section-head`, `.kicker[data-num]`, `.card`, `.card-pad`, `.field`, `.btn`, `.alert`) y tokens oklch.
- **Tests**: importar `{ describe, it, expect }` desde `"vitest"`; alias `@` → `src`. Correr con `npm test`.
- **Idioma**: toda la copy de UI en español.

---

### Task 1: Capa de datos `fitoquimica.ts`

**Files:**
- Create: `src/lib/fitoquimica.ts`
- Test: `src/lib/__tests__/fitoquimica.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Compuesto = "polifenoles" | "flavonoides" | "antocianinas"`
  - `interface MetaCompuesto { id: Compuesto; etiqueta: string; unidad: string }`
  - `type Fuente = "medido" | "literatura"`
  - `interface MuestraFito { id: string; etiqueta: string; codigo: string; fuente: Fuente; cita: string; valores: Record<Compuesto, number | null> }`
  - `const COMPUESTOS: MetaCompuesto[]`
  - `const MUESTRAS: MuestraFito[]`
  - `const NOTA_LITERATURA: string`
  - `function promedioCompuesto(c: Compuesto): number | null`
  - `function maxCompuesto(c: Compuesto): number`
  - `const PERFIL_REFERENCIA: Record<Compuesto, number | null>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/fitoquimica.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  MUESTRAS,
  COMPUESTOS,
  promedioCompuesto,
  maxCompuesto,
  PERFIL_REFERENCIA,
} from "@/lib/fitoquimica";

describe("fitoquimica", () => {
  it("carga las dos muestras reales con sus códigos", () => {
    expect(MUESTRAS.map((m) => m.codigo)).toEqual(["S-218-25", "S-219-25"]);
    expect(MUESTRAS[0].valores.polifenoles).toBe(52.8);
    expect(MUESTRAS[1].valores.flavonoides).toBe(49.5);
    expect(MUESTRAS[0].valores.antocianinas).toBeNull();
  });

  it("define los tres compuestos con unidad", () => {
    expect(COMPUESTOS.map((c) => c.id)).toEqual([
      "polifenoles",
      "flavonoides",
      "antocianinas",
    ]);
    expect(COMPUESTOS[2].unidad).toBe("mg Cy3Glu/g");
  });

  it("promedia compuestos medidos e ignora n/d", () => {
    expect(promedioCompuesto("polifenoles")).toBe(52.8);
    expect(promedioCompuesto("flavonoides")).toBeCloseTo(49.75, 2);
    expect(promedioCompuesto("antocianinas")).toBeNull();
  });

  it("maxCompuesto devuelve 0 cuando todo es n/d", () => {
    expect(maxCompuesto("polifenoles")).toBe(52.8);
    expect(maxCompuesto("antocianinas")).toBe(0);
  });

  it("PERFIL_REFERENCIA usa promedios y deja antocianinas en null", () => {
    expect(PERFIL_REFERENCIA.flavonoides).toBeCloseTo(49.75, 2);
    expect(PERFIL_REFERENCIA.antocianinas).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- fitoquimica`
Expected: FAIL — no se puede resolver `@/lib/fitoquimica`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/fitoquimica.ts`:

```ts
export type Compuesto = "polifenoles" | "flavonoides" | "antocianinas";

export interface MetaCompuesto {
  id: Compuesto;
  etiqueta: string;
  unidad: string;
}

export type Fuente = "medido" | "literatura";

export interface MuestraFito {
  id: string;
  etiqueta: string;
  codigo: string; // código interno de laboratorio
  fuente: Fuente;
  cita: string;
  valores: Record<Compuesto, number | null>; // null = no determinado (n/d)
}

export const COMPUESTOS: MetaCompuesto[] = [
  { id: "polifenoles", etiqueta: "Polifenoles totales", unidad: "mg EAG/g" },
  { id: "flavonoides", etiqueta: "Flavonoides totales", unidad: "mg QE/g" },
  { id: "antocianinas", etiqueta: "Antocianinas totales", unidad: "mg Cy3Glu/g" },
];

export const MUESTRAS: MuestraFito[] = [
  {
    id: "muestra-1",
    etiqueta: "Muestra 1",
    codigo: "S-218-25",
    fuente: "medido",
    cita: "Estudio propio 2025",
    valores: { polifenoles: 52.8, flavonoides: 50.0, antocianinas: null },
  },
  {
    id: "muestra-2",
    etiqueta: "Muestra 2",
    codigo: "S-219-25",
    fuente: "medido",
    cita: "Estudio propio 2025",
    valores: { polifenoles: 52.8, flavonoides: 49.5, antocianinas: null },
  },
];

export const NOTA_LITERATURA =
  "Torres et al. (INACAP, Chile) observaron que el árbol hospedero modifica el " +
  "contenido de fenoles, flavonoides y poder reductor del quintral (maqui, huayún " +
  "y álamo). La fuente no publica valores numéricos; la comparación cuantitativa " +
  "entre hospederos es el objetivo de la fase 2026.";

function valoresMedidos(c: Compuesto): number[] {
  return MUESTRAS.map((m) => m.valores[c]).filter(
    (v): v is number => v !== null,
  );
}

export function promedioCompuesto(c: Compuesto): number | null {
  const vals = valoresMedidos(c);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function maxCompuesto(c: Compuesto): number {
  const vals = valoresMedidos(c);
  return vals.length ? Math.max(...vals) : 0;
}

export const PERFIL_REFERENCIA: Record<Compuesto, number | null> = {
  polifenoles: promedioCompuesto("polifenoles"),
  flavonoides: promedioCompuesto("flavonoides"),
  antocianinas: promedioCompuesto("antocianinas"),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- fitoquimica`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/fitoquimica.ts src/lib/__tests__/fitoquimica.test.ts
git commit -m "feat: capa de datos fitoquimica con datos reales 2025"
```

---

### Task 2: Componente `RadarChart`

**Files:**
- Create: `src/components/RadarChart.tsx`
- Test: `src/components/__tests__/RadarChart.test.tsx`

**Interfaces:**
- Consumes: nada (genérico).
- Produces:
  - `interface RadarSerie { nombre: string; color: string; valores: (number | null)[] }`
  - `interface RadarChartProps { ejes: string[]; series: RadarSerie[]; size?: number }`
  - `export default function RadarChart(props: RadarChartProps)` — los `valores` van normalizados 0..1 en el mismo orden que `ejes`; `null` se grafica en el origen (centro).

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/RadarChart.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RadarChart from "@/components/RadarChart";

describe("RadarChart", () => {
  it("renderiza un svg accesible con etiquetas de eje", () => {
    render(
      <RadarChart
        ejes={["Polifenoles", "Flavonoides", "Antocianinas (n/d)"]}
        series={[{ nombre: "Muestra 1", color: "#c00", valores: [1, 0.99, null] }]}
      />,
    );
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Muestra 1"),
    );
    expect(screen.getByText("Antocianinas (n/d)")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RadarChart`
Expected: FAIL — no se puede resolver `@/components/RadarChart`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/RadarChart.tsx`:

```tsx
export interface RadarSerie {
  nombre: string;
  color: string;
  valores: (number | null)[]; // 0..1, mismo orden que ejes
}

export interface RadarChartProps {
  ejes: string[];
  series: RadarSerie[];
  size?: number;
}

export default function RadarChart({ ejes, series, size = 320 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 52; // margen para etiquetas
  const n = ejes.length;
  const angulo = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const punto = (i: number, frac: number): [number, number] => {
    const a = angulo(i);
    return [cx + Math.cos(a) * r * frac, cy + Math.sin(a) * r * frac];
  };
  const anillos = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="radar"
      role="img"
      aria-label={`Gráfico de radar comparando ${series
        .map((s) => s.nombre)
        .join(" y ")} en ${ejes.join(", ")}`}
    >
      {anillos.map((frac) => (
        <polygon
          key={frac}
          className="radar-grid"
          points={ejes.map((_, i) => punto(i, frac).join(",")).join(" ")}
        />
      ))}

      {ejes.map((eje, i) => {
        const [x, y] = punto(i, 1);
        const [lx, ly] = punto(i, 1.16);
        return (
          <g key={eje}>
            <line x1={cx} y1={cy} x2={x} y2={y} className="radar-axis" />
            <text
              x={lx}
              y={ly}
              className="radar-label"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {eje}
            </text>
          </g>
        );
      })}

      {series.map((s) => (
        <polygon
          key={s.nombre}
          className="radar-serie"
          points={s.valores.map((v, i) => punto(i, v ?? 0).join(",")).join(" ")}
          fill={s.color}
          fillOpacity={0.18}
          stroke={s.color}
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- RadarChart`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/RadarChart.tsx src/components/__tests__/RadarChart.test.tsx
git commit -m "feat: componente RadarChart en SVG accesible"
```

---

### Task 3: Componente `BarChart`

**Files:**
- Create: `src/components/BarChart.tsx`
- Test: `src/components/__tests__/BarChart.test.tsx`

**Interfaces:**
- Consumes: nada (genérico).
- Produces:
  - `interface Barra { etiqueta: string; valor: number | null; unidad: string; color: string }`
  - `interface BarChartProps { barras: Barra[]; maxY?: number; size?: { w: number; h: number } }`
  - `export default function BarChart(props: BarChartProps)` — `valor` `null` se dibuja como barra rayada con rótulo "n/d".

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/BarChart.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BarChart from "@/components/BarChart";

describe("BarChart", () => {
  it("muestra el valor con unidad y marca n/d", () => {
    render(
      <BarChart
        barras={[
          { etiqueta: "Polifenoles", valor: 52.8, unidad: "mg EAG/g", color: "#2a2" },
          { etiqueta: "Antocianinas", valor: null, unidad: "mg Cy3Glu/g", color: "#2a2" },
        ]}
      />,
    );
    expect(screen.getByText("52.8 mg EAG/g")).toBeInTheDocument();
    expect(screen.getByText("n/d")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- BarChart`
Expected: FAIL — no se puede resolver `@/components/BarChart`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/BarChart.tsx`:

```tsx
export interface Barra {
  etiqueta: string;
  valor: number | null;
  unidad: string;
  color: string;
}

export interface BarChartProps {
  barras: Barra[];
  maxY?: number;
  size?: { w: number; h: number };
}

export default function BarChart({
  barras,
  maxY,
  size = { w: 460, h: 300 },
}: BarChartProps) {
  const { w, h } = size;
  const padL = 46;
  const padR = 16;
  const padT = 26;
  const padB = 50;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const tope = maxY ?? Math.max(60, ...barras.map((b) => b.valor ?? 0));
  const bw = plotW / barras.length;
  const yDe = (v: number) => padT + plotH * (1 - v / tope);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * tope));

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="bar-chart"
      role="img"
      aria-label={`Gráfico de barras: ${barras
        .map((b) => `${b.etiqueta} ${b.valor ?? "no determinado"} ${b.unidad}`)
        .join("; ")}`}
    >
      <defs>
        <pattern
          id="nd-hatch"
          width="6"
          height="6"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="6" height="6" fill="var(--line-soft)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink-faint)" strokeWidth="1.5" />
        </pattern>
      </defs>

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

      {barras.map((b, i) => {
        const x = padL + i * bw + bw * 0.18;
        const innerW = bw * 0.64;
        // Chequear `b.valor === null` directamente para que TS estreche a number.
        const y = b.valor === null ? padT : yDe(b.valor);
        const bh = b.valor === null ? plotH : plotH * (b.valor / tope);
        return (
          <g key={b.etiqueta}>
            <rect
              x={x}
              y={y}
              width={innerW}
              height={bh}
              rx={6}
              className="bar-rect"
              fill={b.valor === null ? "url(#nd-hatch)" : b.color}
            />
            <text
              x={x + innerW / 2}
              y={b.valor === null ? padT + plotH / 2 : y - 6}
              className="bar-value"
              textAnchor="middle"
            >
              {b.valor === null ? "n/d" : `${b.valor} ${b.unidad}`}
            </text>
            <text
              x={x + innerW / 2}
              y={h - padB + 18}
              className="bar-cat"
              textAnchor="middle"
            >
              {b.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- BarChart`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/BarChart.tsx src/components/__tests__/BarChart.test.tsx
git commit -m "feat: componente BarChart en SVG con barra n/d"
```

---

### Task 4: Sección `CompararSection`

**Files:**
- Create: `src/components/CompararSection.tsx`
- Test: `src/components/__tests__/CompararSection.test.tsx`

**Interfaces:**
- Consumes: `COMPUESTOS`, `MUESTRAS`, `maxCompuesto`, `NOTA_LITERATURA` de `@/lib/fitoquimica`; `RadarChart` (+ `RadarSerie`) de `@/components/RadarChart`.
- Produces: `export default function CompararSection()` — sin props; `<section id="comparar">`.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/CompararSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompararSection from "@/components/CompararSection";

describe("CompararSection", () => {
  it("muestra el título, la tabla con datos reales y antocianinas n/d", () => {
    render(<CompararSection />);
    expect(
      screen.getByRole("heading", {
        name: "Comparar compuestos entre hospederos",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/S-218-25/)).toBeInTheDocument();
    expect(screen.getAllByText("n/d").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CompararSection`
Expected: FAIL — no se puede resolver `@/components/CompararSection`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/CompararSection.tsx`:

```tsx
"use client";
import RadarChart, { type RadarSerie } from "@/components/RadarChart";
import {
  COMPUESTOS,
  MUESTRAS,
  maxCompuesto,
  NOTA_LITERATURA,
} from "@/lib/fitoquimica";

const COLORES_MUESTRA = ["var(--quintral)", "var(--forest-bright)"];

export default function CompararSection() {
  const ejes = COMPUESTOS.map((c) =>
    maxCompuesto(c.id) === 0 ? `${c.etiqueta} (n/d)` : c.etiqueta,
  );

  const series: RadarSerie[] = MUESTRAS.map((m, i) => ({
    nombre: m.etiqueta,
    color: COLORES_MUESTRA[i % COLORES_MUESTRA.length],
    valores: COMPUESTOS.map((c) => {
      const max = maxCompuesto(c.id);
      const v = m.valores[c.id];
      return max === 0 || v === null ? null : v / max;
    }),
  }));

  return (
    <section id="comparar" className="section">
      <div className="section-head">
        <p className="kicker" data-num="03">
          Análisis fitoquímico
        </p>
        <h2>Comparar compuestos entre hospederos</h2>
        <p>
          Aún no hay mediciones separadas por hospedero. Mostramos el perfil
          fitoquímico medido del quintral (dos muestras reales de laboratorio) y la
          evidencia cualitativa de que el hospedero influye en estos compuestos. La
          comparación numérica entre hospederos es el objetivo de la fase 2026.
        </p>
      </div>

      <div className="chart-grid">
        <div className="card card-pad">
          <RadarChart ejes={ejes} series={series} />
          <ul className="chart-legend">
            {series.map((s) => (
              <li key={s.nombre}>
                <span className="legend-dot" style={{ background: s.color }} />
                {s.nombre}
              </li>
            ))}
          </ul>
        </div>

        <div className="card card-pad">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Compuesto</th>
                {MUESTRAS.map((m) => (
                  <th scope="col" key={m.id}>
                    {m.etiqueta}
                  </th>
                ))}
                <th scope="col">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {COMPUESTOS.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.etiqueta}</th>
                  {MUESTRAS.map((m) => (
                    <td key={m.id}>{m.valores[c.id] ?? "n/d"}</td>
                  ))}
                  <td>{c.unidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="data-source">
            Fuente: {MUESTRAS[0].cita} · códigos{" "}
            {MUESTRAS.map((m) => m.codigo).join(", ")}.
          </p>
          <p className="alert alert--ok chart-note">{NOTA_LITERATURA}</p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CompararSection`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/CompararSection.tsx src/components/__tests__/CompararSection.test.tsx
git commit -m "feat: seccion Comparar compuestos entre hospederos"
```

---

### Task 5: Sección `PrediccionSection`

**Files:**
- Create: `src/components/PrediccionSection.tsx`
- Test: `src/components/__tests__/PrediccionSection.test.tsx`

**Interfaces:**
- Consumes: `HOSPEDEROS`, `etiquetaHospedero` de `@/lib/hosts`; `Host` de `@/lib/types`; `COMPUESTOS`, `PERFIL_REFERENCIA` de `@/lib/fitoquimica`; `BarChart` (+ `Barra`) de `@/components/BarChart`.
- Produces: `export default function PrediccionSection()` — sin props; `<section id="predecir">`.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/PrediccionSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrediccionSection from "@/components/PrediccionSection";

describe("PrediccionSection", () => {
  it("revela el perfil de referencia tras enviar el formulario", () => {
    render(<PrediccionSection />);
    expect(
      screen.queryByText(/no medición de tu ejemplar/),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /perfil de referencia/i }),
    );

    expect(
      screen.getByText(/no medición de tu ejemplar/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Perfil de referencia para un ejemplar en Aromo/,
      }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PrediccionSection`
Expected: FAIL — no se puede resolver `@/components/PrediccionSection`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/PrediccionSection.tsx`:

```tsx
"use client";
import { useState } from "react";
import BarChart, { type Barra } from "@/components/BarChart";
import { HOSPEDEROS, etiquetaHospedero } from "@/lib/hosts";
import { COMPUESTOS, PERFIL_REFERENCIA } from "@/lib/fitoquimica";
import type { Host } from "@/lib/types";

export default function PrediccionSection() {
  const [hospedero, setHospedero] = useState<Host>("aromo");
  const [fenologia, setFenologia] = useState("");
  const [enviado, setEnviado] = useState<{ hospedero: Host } | null>(null);

  const barras: Barra[] = COMPUESTOS.map((c) => ({
    etiqueta: c.etiqueta,
    valor: PERFIL_REFERENCIA[c.id],
    unidad: c.unidad,
    color: "var(--forest)",
  }));

  return (
    <section id="predecir" className="section--tint">
      <div className="section section-inner">
        <div className="section-head">
          <p className="kicker" data-num="04">
            Estimación
          </p>
          <h2>Predicción fitoquímica del ejemplar</h2>
          <p>
            Indica el hospedero y la fenología del ejemplar para ver su perfil
            fitoquímico de referencia.
          </p>
        </div>

        <div className="chart-grid">
          <form
            className="card card-pad predecir-form"
            onSubmit={(e) => {
              e.preventDefault();
              setEnviado({ hospedero });
            }}
          >
            <label className="field">
              <span>Hospedero</span>
              <select
                value={hospedero}
                onChange={(e) => setHospedero(e.target.value as Host)}
              >
                {HOSPEDEROS.map((h) => (
                  <option key={h} value={h}>
                    {etiquetaHospedero(h)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Fenología</span>
              <input
                type="text"
                value={fenologia}
                onChange={(e) => setFenologia(e.target.value)}
                placeholder="en flor, con frutos, vegetativo…"
              />
            </label>

            <button type="submit" className="btn btn--primary contribute-submit">
              Ver perfil de referencia
            </button>
          </form>

          <div className="card card-pad">
            {!enviado ? (
              <p className="result-empty">
                Completa el formulario para ver el perfil fitoquímico de referencia
                del ejemplar.
              </p>
            ) : (
              <>
                <h3 className="result-title">
                  Perfil de referencia para un ejemplar en{" "}
                  {etiquetaHospedero(enviado.hospedero)}
                </h3>
                <BarChart barras={barras} />
                <p className="alert alert--ok chart-note">
                  Valores de referencia (quintral medido 2025), no medición de tu
                  ejemplar. La variación por hospedero está en estudio (fase 2026).
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PrediccionSection`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/PrediccionSection.tsx src/components/__tests__/PrediccionSection.test.tsx
git commit -m "feat: seccion Prediccion fitoquimica del ejemplar"
```

---

### Task 6: Integración (montaje, nav, estilos)

**Files:**
- Modify: `src/components/HomeClient.tsx`
- Modify: `src/components/Nav.tsx`
- Modify: `src/components/ContributeForm.tsx:90` (kicker `03` → `05`)
- Modify: `src/app/globals.css` (estilos de gráficos; regla responsive del nav)

**Interfaces:**
- Consumes: `CompararSection`, `PrediccionSection`.
- Produces: secciones montadas y visibles en la home, con navegación y estilos.

- [ ] **Step 1: Montar las secciones en `HomeClient.tsx`**

Reemplaza el contenido completo de `src/components/HomeClient.tsx` por:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { Observation } from "@/lib/types";
import { fetchObservations } from "@/lib/observations";
import IdentifySection from "@/components/IdentifySection";
import MapSection from "@/components/MapSection";
import CompararSection from "@/components/CompararSection";
import PrediccionSection from "@/components/PrediccionSection";
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
      <CompararSection />
      <PrediccionSection />
      <ContributeForm
        prefill={prefill}
        onCreated={(o) => setObservations((prev) => [o, ...prev])}
      />
    </>
  );
}
```

- [ ] **Step 2: Agregar links en `Nav.tsx`**

En `src/components/Nav.tsx`, reemplaza el bloque `<div className="nav-links">…</div>` por:

```tsx
        <div className="nav-links">
          <a href="#identificar">Identificar</a>
          <a href="#mapa">Mapa</a>
          <a href="#comparar">Compuestos</a>
          <a href="#predecir">Predicción</a>
          <a href="#aportar">Ciencia ciudadana</a>
        </div>
```

- [ ] **Step 3: Actualizar el kicker de `ContributeForm.tsx`**

En `src/components/ContributeForm.tsx` línea 90, cambia:

```tsx
        <p className="kicker" data-num="03">Ciencia ciudadana</p>
```

por:

```tsx
        <p className="kicker" data-num="05">Ciencia ciudadana</p>
```

- [ ] **Step 4: Agregar estilos en `globals.css`**

Añade al final de `src/app/globals.css`:

```css
/* ============================================================
   Secciones de fitoquímica: gráficos
   ============================================================ */

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(1rem, 0.5rem + 1.5vw, 1.75rem);
  align-items: start;
}

.radar {
  width: 100%;
  height: auto;
  display: block;
}

.radar-grid {
  fill: none;
  stroke: var(--line-soft);
  stroke-width: 1;
}

.radar-axis {
  stroke: var(--line);
  stroke-width: 1;
}

.radar-label {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  fill: var(--ink-soft);
}

.chart-legend {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.chart-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex: none;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid var(--line-soft);
}

.data-table thead th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-faint);
}

.data-table tbody th {
  font-weight: 600;
  color: var(--ink);
}

.data-table td {
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.data-source {
  margin: 0.85rem 0 0;
  font-size: 0.82rem;
  color: var(--ink-faint);
}

.chart-note {
  margin-top: 1rem;
  font-size: 0.9rem;
}

.bar-chart {
  width: 100%;
  height: auto;
  display: block;
}

.bar-grid {
  stroke: var(--line-soft);
  stroke-width: 1;
}

.bar-tick,
.bar-cat {
  font-family: var(--font-sans);
  font-size: 11px;
  fill: var(--ink-faint);
}

.bar-cat {
  fill: var(--ink-soft);
  font-weight: 600;
}

.bar-value {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 700;
  fill: var(--ink);
}

.predecir-form {
  display: grid;
  gap: 1rem;
  align-content: start;
}

@media (max-width: 860px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Ajustar la regla responsive del nav en `globals.css`**

En `src/app/globals.css`, reemplaza el bloque existente:

```css
@media (max-width: 560px) {
  .nav-links a:nth-child(3) {
    display: none;
  }
}
```

por:

```css
@media (max-width: 560px) {
  .nav-links a:nth-child(n + 3) {
    display: none;
  }
}
```

- [ ] **Step 6: Verificar suite completa y build**

Run: `npm test`
Expected: PASS — todas las suites (las nuevas + las existentes).

Run: `npm run build`
Expected: build de Next.js exitoso, sin errores de TypeScript ni de lint.

- [ ] **Step 7: Commit**

```bash
git add src/components/HomeClient.tsx src/components/Nav.tsx src/components/ContributeForm.tsx src/app/globals.css
git commit -m "feat: montar secciones de fitoquimica en la home"
```

---

## Notas de verificación manual

Tras `npm run build`, correr `npm run dev` y revisar en el navegador:
- La sección "Comparar compuestos entre hospederos" muestra el radar con dos polígonos casi idénticos (Muestra 1 / Muestra 2), el eje de antocianinas rotulado "(n/d)", la tabla con códigos S-218-25 / S-219-25 y la nota de Torres et al.
- La sección "Predicción fitoquímica del ejemplar" parte sin gráfico; al enviar el formulario aparece el bar chart (polifenoles 52,8 · flavonoides 49,75 · antocianinas rayada n/d) y el rótulo "no medición de tu ejemplar".
- El nav navega a `#comparar` y `#predecir`.
- Verificar `prefers-reduced-motion` (sistema): sin animaciones de entrada.
