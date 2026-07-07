# Rediseño UX de Biblioteca fitoquímica y Evidencia antimicrobiana — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar las secciones "Biblioteca fitoquímica" y "Evidencia sobre actividad antimicrobiana" con divulgación progresiva (mensaje simple arriba, detalle al expandir), una matriz-panorama y un veredicto narrativo, sin perder contenido científico.

**Architecture:** React (Next.js, componentes cliente) + datos tipados en `src/lib/*` + estilos en un único `globals.css` con tokens `oklch` existentes. Se añade un campo canónico `propiedades` a los datos de compuestos para alimentar la matriz sin inferir por texto. Un componente nuevo `MatrizFito` renderiza la tabla-panorama; `BibliotecaFito` y `EvidenciaAntimicrobiana` se reescriben.

**Tech Stack:** TypeScript, React 18, Next.js, Vitest + Testing Library.

## Global Constraints

- Identidad visual: estilo sobrio, **sin emoji** como íconos de compuestos, chips con contorno, acento de familia por color. Usar tokens reales de `globals.css`: `--forest`, `--forest-bright`, `--surface`, `--ink`, `--ink-soft`, `--line`, `--r-sm`, `--r-md`, `--r-pill`.
- Idioma de toda la UI y los textos: **español**.
- No eliminar contenido científico: todo lo que hoy se muestra debe seguir accesible (visible o dentro de un `<details>`).
- Sin nuevas dependencias.
- El veredicto de Evidencia usa **tono neutro (pizarra/gris), nunca rojo de alarma**.
- Comando de tests: `npx vitest run <archivo>` para uno; `npm test` para todo.

---

### Task 1: Extender el modelo de datos de compuestos

**Files:**
- Modify: `src/lib/bibliotecaFito.ts`
- Test: `src/lib/__tests__/bibliotecaFito.test.ts`

**Interfaces:**
- Produces:
  - `type PropiedadCanonica = "Antioxidante" | "Antiinflamatoria" | "Antimicrobiana" | "Antifúngica" | "Antivírica" | "Anticancerígena" | "Cardio"`
  - `const PROPIEDADES_CANONICAS: PropiedadCanonica[]` (orden de columnas de la matriz)
  - `FichaCompuesto` gana: `familia: string`, `resumen: string`, `propiedades: PropiedadCanonica[]`
  - `BIBLIOTECA: FichaCompuesto[]` (sin cambios de longitud ni de los campos existentes)

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `src/lib/__tests__/bibliotecaFito.test.ts` (dentro del `describe` existente o uno nuevo). Primero inspecciona el archivo para ver los imports actuales; añade `PROPIEDADES_CANONICAS` al import de `@/lib/bibliotecaFito`.

```ts
import { BIBLIOTECA, PROPIEDADES_CANONICAS } from "@/lib/bibliotecaFito";

describe("modelo canónico de la Biblioteca", () => {
  it("cada ficha tiene familia, resumen y propiedades canónicas válidas", () => {
    for (const f of BIBLIOTECA) {
      expect(f.familia.length).toBeGreaterThan(0);
      expect(f.resumen.length).toBeGreaterThan(0);
      expect(f.propiedades.length).toBeGreaterThan(0);
      for (const p of f.propiedades) {
        expect(PROPIEDADES_CANONICAS).toContain(p);
      }
    }
  });

  it("expone 7 propiedades canónicas en orden de columnas", () => {
    expect(PROPIEDADES_CANONICAS).toEqual([
      "Antioxidante",
      "Antiinflamatoria",
      "Antimicrobiana",
      "Antifúngica",
      "Antivírica",
      "Anticancerígena",
      "Cardio",
    ]);
  });

  it("los polifenoles marcan antioxidante y antimicrobiana", () => {
    const poli = BIBLIOTECA.find((f) => f.id === "polifenoles")!;
    expect(poli.propiedades).toContain("Antioxidante");
    expect(poli.propiedades).toContain("Antimicrobiana");
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx vitest run src/lib/__tests__/bibliotecaFito.test.ts`
Expected: FAIL — `PROPIEDADES_CANONICAS` no existe / `familia` no está en el tipo.

- [ ] **Step 3: Implementar el modelo**

En `src/lib/bibliotecaFito.ts`, añadir el tipo y la constante antes de `BIBLIOTECA`, y ampliar la interfaz:

```ts
export type PropiedadCanonica =
  | "Antioxidante"
  | "Antiinflamatoria"
  | "Antimicrobiana"
  | "Antifúngica"
  | "Antivírica"
  | "Anticancerígena"
  | "Cardio";

export const PROPIEDADES_CANONICAS: PropiedadCanonica[] = [
  "Antioxidante",
  "Antiinflamatoria",
  "Antimicrobiana",
  "Antifúngica",
  "Antivírica",
  "Anticancerígena",
  "Cardio",
];

export interface FichaCompuesto {
  id: string;
  nombre: string;
  familia: string;
  resumen: string;
  propiedades: PropiedadCanonica[];
  queEs: string;
  funcionEnPlanta: string[];
  aplicacionesBiomedicas: string[];
  presenteEnQuintral: true;
  estudios: EstudioFito[];
}
```

Luego añadir `familia`, `resumen` y `propiedades` a cada objeto de `BIBLIOTECA` (mantener el resto igual):

```ts
// polifenoles
familia: "Compuesto fenólico",
resumen: "Defensa antioxidante de la planta",
propiedades: ["Antioxidante", "Antiinflamatoria", "Antimicrobiana", "Anticancerígena", "Cardio"],

// flavonoides
familia: "Polifenol (subgrupo)",
resumen: "Pigmentos que protegen y defienden",
propiedades: ["Antioxidante", "Antiinflamatoria", "Antimicrobiana", "Antivírica", "Cardio"],

// terpenoides
familia: "Metabolito secundario",
resumen: "Aromas y resinas defensivas",
propiedades: ["Antiinflamatoria", "Antimicrobiana", "Antifúngica", "Anticancerígena"],

// quinonas
familia: "Compuesto aromático",
resumen: "Defensa química frente a microbios",
propiedades: ["Antimicrobiana", "Antifúngica", "Antivírica", "Anticancerígena"],

// esteroles
familia: "Fitosterol / lípido",
resumen: "Lípidos estructurales de la membrana",
propiedades: ["Antiinflamatoria", "Cardio"],

// glicosidos
familia: "Glicósido",
resumen: "Azúcares que almacenan compuestos activos",
propiedades: ["Antioxidante", "Antiinflamatoria", "Antimicrobiana", "Anticancerígena", "Cardio"],
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `npx vitest run src/lib/__tests__/bibliotecaFito.test.ts`
Expected: PASS (todos los `it`, incluidos los previos del archivo).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bibliotecaFito.ts src/lib/__tests__/bibliotecaFito.test.ts
git commit -m "feat: añadir modelo canónico (familia/resumen/propiedades) a la Biblioteca"
```

---

### Task 2: Componente `MatrizFito` (matriz-panorama)

**Files:**
- Create: `src/components/MatrizFito.tsx`
- Test: `src/components/__tests__/MatrizFito.test.tsx`

**Interfaces:**
- Consumes: `BIBLIOTECA`, `PROPIEDADES_CANONICAS` de Task 1.
- Produces: `export default function MatrizFito()` — renderiza una `<table>` con 6 filas de compuestos y 7 columnas de propiedades.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/components/__tests__/MatrizFito.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MatrizFito from "@/components/MatrizFito";

describe("MatrizFito", () => {
  it("renderiza una tabla con los 6 compuestos y las 7 propiedades", () => {
    render(<MatrizFito />);
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByRole("columnheader", { name: "Antioxidante" })).toBeInTheDocument();
    expect(within(tabla).getByRole("rowheader", { name: "Polifenoles" })).toBeInTheDocument();
    expect(within(tabla).getByRole("rowheader", { name: "Glicósidos" })).toBeInTheDocument();
  });

  it("marca cada celda con texto accesible sí/no", () => {
    render(<MatrizFito />);
    // Polifenoles: 5 propiedades presentes de 7 -> hay celdas "sí" y "no"
    expect(screen.getAllByText("sí").length).toBeGreaterThan(0);
    expect(screen.getAllByText("no").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx vitest run src/components/__tests__/MatrizFito.test.tsx`
Expected: FAIL — no existe `@/components/MatrizFito`.

- [ ] **Step 3: Implementar el componente**

Crear `src/components/MatrizFito.tsx`:

```tsx
"use client";
import { BIBLIOTECA, PROPIEDADES_CANONICAS } from "@/lib/bibliotecaFito";

export default function MatrizFito() {
  return (
    <div className="fito-matriz">
      <div className="fito-matriz-scroll">
        <table className="fito-matriz-tabla">
          <thead>
            <tr>
              <th scope="col">Compuesto</th>
              {PROPIEDADES_CANONICAS.map((p) => (
                <th scope="col" key={p}>
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BIBLIOTECA.map((ficha) => (
              <tr key={ficha.id}>
                <th scope="row">{ficha.nombre}</th>
                {PROPIEDADES_CANONICAS.map((p) => {
                  const tiene = ficha.propiedades.includes(p);
                  return (
                    <td key={p} className={tiene ? "fito-cell yes" : "fito-cell no"}>
                      <span className="sr-only">{tiene ? "sí" : "no"}</span>
                      <span aria-hidden="true">{tiene ? "✓" : "·"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fito-matriz-nota">
        Casi todos los compuestos del quintral son{" "}
        <strong>antioxidantes, antiinflamatorios y antimicrobianos</strong>: por eso
        interesa estudiar su potencial biomédico.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `npx vitest run src/components/__tests__/MatrizFito.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MatrizFito.tsx src/components/__tests__/MatrizFito.test.tsx
git commit -m "feat: añadir matriz-panorama MatrizFito"
```

---

### Task 3: Rediseñar `BibliotecaFito` (fichas + matriz)

**Files:**
- Modify: `src/components/BibliotecaFito.tsx`
- Test: `src/components/__tests__/BibliotecaFito.test.tsx`

**Interfaces:**
- Consumes: `BIBLIOTECA` (con `familia`/`resumen`/`propiedades`), `MatrizFito` de Task 2.

- [ ] **Step 1: Actualizar el test (romperá con el diseño viejo)**

Reemplazar el contenido de `src/components/__tests__/BibliotecaFito.test.tsx` por:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BibliotecaFito from "@/components/BibliotecaFito";

describe("BibliotecaFito", () => {
  it("muestra la matriz-panorama y los 6 compuestos con su resumen", () => {
    render(<BibliotecaFito />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Polifenoles")).toBeInTheDocument();
    expect(screen.getByText("Glicósidos")).toBeInTheDocument();
    expect(screen.getByText(/defensa antioxidante de la planta/i)).toBeInTheDocument();
  });

  it("muestra las aplicaciones como chips y pliega el detalle", () => {
    render(<BibliotecaFito />);
    // el resumen "¿Qué es?" completo vive dentro de un <details> plegado
    expect(screen.getAllByText(/ver función y estudios/i).length).toBe(6);
  });

  it("incluye enlaces a los estudios científicos", () => {
    render(<BibliotecaFito />);
    const enlaces = screen.getAllByRole("link", {
      name: /ver estudio|scielo|Torres|Simirgiotis/i,
    });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx vitest run src/components/__tests__/BibliotecaFito.test.tsx`
Expected: FAIL — el diseño actual no tiene tabla ni "ver función y estudios".

- [ ] **Step 3: Reescribir el componente**

Reemplazar `src/components/BibliotecaFito.tsx` por:

```tsx
"use client";
import { BIBLIOTECA } from "@/lib/bibliotecaFito";
import MatrizFito from "@/components/MatrizFito";

export default function BibliotecaFito() {
  return (
    <div className="biblioteca">
      <h3 className="biblioteca-titulo">Biblioteca fitoquímica</h3>
      <p className="biblioteca-intro">
        Los compuestos detectados en el quintral y las propiedades biomédicas que se
        investigan. La tabla resume el panorama; cada ficha guarda el detalle.
      </p>

      <MatrizFito />

      <div className="biblioteca-grid">
        {BIBLIOTECA.map((ficha) => (
          <article key={ficha.id} className="card card-pad ficha">
            <span className="ficha-familia">{ficha.familia}</span>
            <h4 className="ficha-nombre">{ficha.nombre}</h4>
            <p className="ficha-resumen">{ficha.resumen}</p>

            <ul className="ficha-chips" aria-label="Aplicaciones biomédicas">
              {ficha.aplicacionesBiomedicas.map((a) => (
                <li key={a} className="ficha-chip">
                  {a.replace(/\.$/, "")}
                </li>
              ))}
            </ul>

            <details className="ficha-detalle">
              <summary>Ver función y estudios</summary>

              <p className="ficha-label">¿Qué es?</p>
              <p>{ficha.queEs}</p>

              <p className="ficha-label">¿Qué función tiene en la planta?</p>
              <ul className="ficha-lista">
                {ficha.funcionEnPlanta.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <p className="alert alert--ok">✅ Detectado en el quintral.</p>

              <p className="ficha-label">Estudios científicos</p>
              <ul className="ficha-estudios">
                {ficha.estudios.map((e) => (
                  <li key={e.url + e.cita}>
                    <strong>{e.cita}.</strong> {e.descripcion}{" "}
                    <a href={e.url} target="_blank" rel="noopener noreferrer">
                      Ver estudio
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `npx vitest run src/components/__tests__/BibliotecaFito.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BibliotecaFito.tsx src/components/__tests__/BibliotecaFito.test.tsx
git commit -m "feat: rediseñar fichas de la Biblioteca con resumen, chips y detalle plegado"
```

---

### Task 4: Rediseñar `EvidenciaAntimicrobiana` (narrativa + veredicto)

**Files:**
- Modify: `src/components/EvidenciaAntimicrobiana.tsx`
- Test: `src/components/__tests__/EvidenciaAntimicrobiana.test.tsx`

**Interfaces:**
- Consumes: `RESULTADOS`, `CONCENTRACIONES`, `CONTROL_POSITIVO`, `CONTROL_NEGATIVO`, `HOSPEDEROS_ENSAYADOS`, `NOTA_LITERATURA`, `FACTORES`, `LINEAS_FUTURAS`, `APRENDIZAJE` de `@/lib/antimicrobiano` (sin cambios de datos).

- [ ] **Step 1: Actualizar el test (romperá con el diseño viejo)**

Reemplazar el contenido de `src/components/__tests__/EvidenciaAntimicrobiana.test.tsx` por:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EvidenciaAntimicrobiana from "@/components/EvidenciaAntimicrobiana";

describe("EvidenciaAntimicrobiana", () => {
  it("muestra el veredicto sin inhibición y las 3 bacterias", () => {
    render(<EvidenciaAntimicrobiana />);
    expect(screen.getByText(/sin inhibición del crecimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/Escherichia coli/)).toBeInTheDocument();
    expect(screen.getByText(/Staphylococcus aureus/)).toBeInTheDocument();
    expect(screen.getByText(/Enterococcus faecalis/)).toBeInTheDocument();
  });

  it("presenta la narrativa, el aprendizaje y pliega el detalle técnico", () => {
    render(<EvidenciaAntimicrobiana />);
    expect(screen.getByRole("heading", { name: /la pregunta/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /qué significa/i })).toBeInTheDocument();
    expect(screen.getByText(/no mostraron actividad antimicrobiana/i)).toBeInTheDocument();
    // el detalle técnico (concentraciones/controles) está dentro de un <details>
    expect(screen.getByText(/ver detalles del ensayo/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx vitest run src/components/__tests__/EvidenciaAntimicrobiana.test.tsx`
Expected: FAIL — no existe "la pregunta" ni "ver detalles del ensayo".

- [ ] **Step 3: Reescribir el componente**

Reemplazar `src/components/EvidenciaAntimicrobiana.tsx` por:

```tsx
"use client";
import {
  RESULTADOS,
  CONCENTRACIONES,
  CONTROL_POSITIVO,
  CONTROL_NEGATIVO,
  HOSPEDEROS_ENSAYADOS,
  NOTA_LITERATURA,
  FACTORES,
  LINEAS_FUTURAS,
  APRENDIZAJE,
} from "@/lib/antimicrobiano";

export default function EvidenciaAntimicrobiana() {
  return (
    <div className="antimicrobiano">
      <h3 className="biblioteca-titulo">Evidencia sobre actividad antimicrobiana</h3>

      <div className="ensayo-pasos">
        <article className="ensayo-paso">
          <span className="ensayo-num">1</span>
          <h4>La pregunta</h4>
          <p>¿Los extractos de quintral inhiben el crecimiento de bacterias?</p>
        </article>

        <article className="ensayo-paso">
          <span className="ensayo-num">2</span>
          <h4>Qué probamos</h4>
          <p>
            Extractos etanólicos de quintral hospedado en{" "}
            {HOSPEDEROS_ENSAYADOS.join(" y ")} frente a tres bacterias de referencia,
            a {CONCENTRACIONES.join("–")} µg/mL. Control positivo: {CONTROL_POSITIVO}.
          </p>
        </article>

        <article className="ensayo-veredicto">
          <span className="ensayo-num">3</span>
          <p className="ensayo-label">Resultado del ensayo 2026</p>
          <h4>Sin inhibición del crecimiento</h4>
          <ul className="ensayo-bacterias">
            {RESULTADOS.map((r) => (
              <li key={r.bacteria}>
                <span aria-hidden="true">✕</span> {r.bacteria}
              </li>
            ))}
          </ul>
        </article>

        <article className="ensayo-paso">
          <span className="ensayo-num">4</span>
          <h4>Qué significa</h4>
          <p>
            La ausencia de efecto también es evidencia: orienta hacia otros
            hospederos, solventes y concentraciones.
          </p>
        </article>
      </div>

      <details className="ensayo-detalle">
        <summary>Ver detalles del ensayo</summary>

        <p className="data-source">
          {NOTA_LITERATURA}
        </p>
        <p className="data-source">
          Concentraciones ensayadas: {CONCENTRACIONES.join(", ")} µg/mL. Control
          positivo: {CONTROL_POSITIVO} (sí mostró actividad); control negativo:{" "}
          {CONTROL_NEGATIVO}. Los antibiogramas a 1024 µg/mL no mostraron halos de
          inhibición para ninguna bacteria.
        </p>

        <div className="antimicrobiano-cols">
          <div>
            <h5>Factores que pueden influir</h5>
            <ul className="ficha-lista">
              {FACTORES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <h5>Investigaciones que continúan</h5>
            <ul className="ficha-lista">
              {LINEAS_FUTURAS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <div className="card card-pad ensayo-aprendizaje">
        <h4>¿Qué aprendimos?</h4>
        <p className="alert alert--ok">{APRENDIZAJE}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `npx vitest run src/components/__tests__/EvidenciaAntimicrobiana.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/EvidenciaAntimicrobiana.tsx src/components/__tests__/EvidenciaAntimicrobiana.test.tsx
git commit -m "feat: rediseñar Evidencia como narrativa de 4 pasos con veredicto neutro"
```

---

### Task 5: Estilos (CSS) para ambas secciones

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: clases usadas por Tasks 2–4 (`fito-matriz*`, `fito-cell`, `sr-only`, `ficha-familia`, `ficha-resumen`, `ficha-chips`, `ficha-chip`, `ficha-detalle`, `ensayo-pasos`, `ensayo-paso`, `ensayo-num`, `ensayo-veredicto`, `ensayo-label`, `ensayo-bacterias`, `ensayo-detalle`, `ensayo-aprendizaje`).

Esta task no lleva test unitario (es puramente visual); se valida en la Task 6 (build + revisión en navegador). Es un único bloque de edición seguido de commit.

- [ ] **Step 1: Añadir los estilos**

Reemplazar el bloque existente que va desde `.biblioteca {` hasta el final de `.antimicrobiano-cols { ... }` en `src/app/globals.css` por el siguiente (conserva las reglas base y añade las nuevas):

```css
/* Utilidad de accesibilidad */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.biblioteca {
  margin-top: 2.5rem;
}
.biblioteca-titulo {
  margin: 0 0 0.35rem;
}
.biblioteca-intro {
  margin: 0 0 1.25rem;
  max-width: 60ch;
  color: var(--ink-soft);
}

/* Matriz-panorama */
.fito-matriz {
  margin: 0 0 1.5rem;
}
.fito-matriz-scroll {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
}
.fito-matriz-tabla {
  border-collapse: collapse;
  width: 100%;
  min-width: 40rem;
  font-size: 0.85rem;
}
.fito-matriz-tabla th,
.fito-matriz-tabla td {
  padding: 0.5rem 0.6rem;
  text-align: center;
  border-bottom: 1px solid var(--line);
}
.fito-matriz-tabla thead th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  vertical-align: bottom;
}
.fito-matriz-tabla tbody th {
  text-align: left;
  white-space: nowrap;
  position: sticky;
  left: 0;
  background: var(--surface);
  font-weight: 600;
}
.fito-cell.yes {
  color: var(--forest-bright);
  font-weight: 800;
}
.fito-cell.no {
  color: var(--line);
}
.fito-matriz-nota {
  margin: 0.7rem 0 0;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.biblioteca-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
}
.ficha-familia {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--forest-bright);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.ficha-familia::before {
  content: "";
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--forest-bright);
}
.ficha-nombre {
  margin: 0.35rem 0 0.15rem;
}
.ficha-resumen {
  margin: 0 0 0.85rem;
  color: var(--ink-soft);
}
.ficha-chips {
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.ficha-chip {
  border: 1px solid var(--forest-bright);
  color: var(--forest);
  background: color-mix(in oklch, var(--forest-bright) 10%, var(--surface));
  border-radius: var(--r-sm);
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 600;
}
.ficha-label {
  font-weight: 600;
  margin: 0.9rem 0 0.25rem;
}
.ficha-lista {
  margin: 0;
  padding-left: 1.1rem;
}
.ficha-detalle summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--forest-bright);
  margin-top: 0.6rem;
  border-top: 1px dashed var(--line);
  padding-top: 0.7rem;
}
.ficha-estudios {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.5rem;
}

/* Evidencia: narrativa + veredicto */
.antimicrobiano {
  margin-top: 2.5rem;
}
.ensayo-pasos {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  align-items: stretch;
  margin: 1rem 0;
}
.ensayo-paso,
.ensayo-veredicto {
  flex: 1 1 12rem;
  border-radius: var(--r-md);
  padding: 0.9rem 1rem;
}
.ensayo-paso {
  background: var(--surface);
  border: 1px solid var(--line);
}
.ensayo-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--r-pill);
  background: color-mix(in oklch, var(--forest-bright) 14%, var(--surface));
  color: var(--forest);
  font-weight: 800;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}
.ensayo-paso h4,
.ensayo-veredicto h4 {
  margin: 0.1rem 0 0.3rem;
}
.ensayo-paso p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.ensayo-veredicto {
  flex: 1 1 14rem;
  background: var(--bg-alt);
  border: 1px solid var(--line);
}
.ensayo-veredicto .ensayo-num {
  background: var(--surface);
  color: var(--ink);
}
.ensayo-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-soft);
  font-weight: 700;
  margin: 0;
}
.ensayo-bacterias {
  list-style: none;
  padding: 0;
  margin: 0.4rem 0 0;
  display: grid;
  gap: 0.3rem;
}
.ensayo-bacterias li {
  font-style: italic;
  font-size: 0.86rem;
  display: flex;
  gap: 0.45rem;
  align-items: center;
}
.ensayo-bacterias span {
  font-style: normal;
  font-weight: 800;
  color: var(--ink-soft);
}
.ensayo-detalle {
  margin: 0.4rem 0 1rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 0.7rem 1rem;
  background: var(--surface);
}
.ensayo-detalle summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--forest-bright);
}
.antimicrobiano-cols {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  margin: 1rem 0 0;
}
.ensayo-aprendizaje {
  margin-top: 0.5rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: estilos para matriz-panorama, fichas y narrativa de Evidencia"
```

---

### Task 6: Verificación integral

**Files:** ninguno (verificación).

- [ ] **Step 1: Suite completa de tests**

Run: `npm test`
Expected: PASS — todos los archivos, incluidos los 4 tests tocados.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Revisión visual en el navegador**

Run: `npm run dev` y abrir la página; ir a la sección Comparar (donde se montan `BibliotecaFito` y `EvidenciaAntimicrobiana`).
Verificar:
- La matriz-panorama se ve, hace scroll horizontal en ventana angosta y la primera columna queda fija.
- Las fichas muestran familia + nombre + resumen + chips; "Ver función y estudios" abre el detalle con ¿qué es?, función, presencia y estudios.
- Evidencia: 4 pasos, veredicto en gris/pizarra (no rojo), "Ver detalles del ensayo" pliega concentraciones + factores + líneas futuras; "¿Qué aprendimos?" al cierre.

- [ ] **Step 4: Commit (si hubo ajustes de la revisión)**

```bash
git add -A
git commit -m "fix: ajustes de revisión visual del rediseño UX"
```

---

## Self-Review

- **Cobertura del spec:** matriz-panorama (Task 2/5), ficha estilo B con chips y detalle plegado (Task 3/5), datos canónicos `propiedades`/`resumen`/`familia` (Task 1), narrativa de 4 pasos + veredicto neutro (Task 4/5), detalle técnico y factores/líneas plegados (Task 4), accesibilidad `sr-only` + `scope` + texto explícito (Task 2/5), actualización de tests (Tasks 1,3,4), sin dependencias nuevas. Todo cubierto.
- **Sin placeholders:** cada step trae código o comando real.
- **Consistencia de tipos:** `PropiedadCanonica` y `PROPIEDADES_CANONICAS` definidos en Task 1 y consumidos en Task 2; `familia`/`resumen`/`propiedades` usados en Tasks 2–3 coinciden con la interfaz; clases CSS de Tasks 2–4 están todas definidas en Task 5.
- **Nota de orden:** Tasks 2–4 pasan sus tests (DOM) sin CSS; el estilo llega en Task 5. Los componentes se ven sin estilo entre medio, lo cual es esperado y se valida en Task 6.
