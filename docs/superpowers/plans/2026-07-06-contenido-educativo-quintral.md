# Contenido educativo del quintral — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a la app Quintral Insight una FAQ curada offline (sección nueva), una biblioteca fitoquímica de 6 compuestos y la evidencia antimicrobiana del proyecto 2026 (ambas dentro de la sección Compuestos).

**Architecture:** Contenido 100% estático. Tres archivos de datos puros en `src/lib/` alimentan tres componentes cliente en `src/components/`. La FAQ es una sección propia (`#preguntas`); la biblioteca y la evidencia antimicrobiana se insertan dentro de `CompararSection.tsx`. Sin backend, sin API nueva, compatible con la PWA offline.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest + @testing-library/react. Alias de import `@/` → `src/`.

## Global Constraints

- Todo el copy en **español**.
- Componentes cliente llevan `"use client";` en la primera línea (patrón del repo).
- Reutilizar clases CSS existentes: `.section`, `.section-head`, `.kicker` (con `data-num`), `.card`, `.card-pad`, `.data-table`, `.chart-grid`, `.alert`, `.alert--ok`. Agregar CSS nuevo solo para acordeones/fichas.
- Acordeones y contenido expandible con `<details>/<summary>` nativo (accesible, sin JS, funciona offline).
- Enlaces externos: `target="_blank" rel="noopener noreferrer"`.
- Tests con Vitest: `import { describe, it, expect } from "vitest"`; componentes con `import { render, screen } from "@testing-library/react"`.
- Numeración de kickers (`data-num`) tras insertar la FAQ: 01 Identificar · 02 Mapa · 03 Compuestos · 04 Predicción · **05 Preguntas (nuevo)** · **06 Ciencia ciudadana (antes 05)**.
- El contenido se transcribe del documento `Documentación/Sugerencias de cambios.docx` corrigiendo typos obvios de OCR (p. ej. "hemipa"→"hemiparásita", "Ventas minerales"→"sales minerales", "litro"→"litre", "Salsa"→"sauce"). En este plan el texto ya viene corregido: cópialo verbatim.

---

## File Structure

- `src/lib/faq.ts` — datos de las 15 preguntas/respuestas.
- `src/lib/bibliotecaFito.ts` — 6 fichas de compuestos + estudios.
- `src/lib/antimicrobiano.ts` — resultados, factores, líneas futuras, aprendizaje.
- `src/components/FaqSection.tsx` — sección `#preguntas` (acordeones).
- `src/components/BibliotecaFito.tsx` — grid de fichas expandibles.
- `src/components/EvidenciaAntimicrobiana.tsx` — tabla + bloques de texto.
- `src/components/CompararSection.tsx` — MODIFICAR: insertar los dos componentes + copy.
- `src/components/Nav.tsx` — MODIFICAR: enlace y `SECTIONS`.
- `src/components/HomeClient.tsx` — MODIFICAR: renderizar `FaqSection`.
- `src/components/ContributeForm.tsx` — MODIFICAR: `data-num` 05 → 06.
- `src/app/globals.css` — MODIFICAR: estilos de fichas/acordeones si hacen falta.
- Tests correspondientes en `src/lib/__tests__/` y `src/components/__tests__/`.

---

## Task 1: Datos de la FAQ (`faq.ts`)

**Files:**
- Create: `src/lib/faq.ts`
- Test: `src/lib/__tests__/faq.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `interface PreguntaFaq { pregunta: string; respuesta: string }` y `export const FAQ: PreguntaFaq[]` (15 entradas).

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/__tests__/faq.test.ts
import { describe, it, expect } from "vitest";
import { FAQ } from "@/lib/faq";

describe("FAQ", () => {
  it("tiene 15 preguntas con texto no vacío", () => {
    expect(FAQ).toHaveLength(15);
    for (const item of FAQ) {
      expect(item.pregunta.trim().length).toBeGreaterThan(0);
      expect(item.respuesta.trim().length).toBeGreaterThan(0);
    }
  });

  it("empieza por la definición del quintral", () => {
    expect(FAQ[0].pregunta).toBe("¿Qué es el quintral?");
    expect(FAQ[0].respuesta).toContain("Tristerix corymbosus");
  });

  it("no tiene preguntas duplicadas", () => {
    const set = new Set(FAQ.map((f) => f.pregunta));
    expect(set.size).toBe(FAQ.length);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/lib/__tests__/faq.test.ts`
Expected: FAIL (`Cannot find module '@/lib/faq'`).

- [ ] **Step 3: Crear `src/lib/faq.ts` con el contenido**

```ts
export interface PreguntaFaq {
  pregunta: string;
  respuesta: string;
}

export const FAQ: PreguntaFaq[] = [
  {
    pregunta: "¿Qué es el quintral?",
    respuesta:
      "El quintral (Tristerix corymbosus) es una planta nativa de Chile perteneciente a la familia Loranthaceae. Es una planta hemiparásita, lo que significa que vive sobre árboles y arbustos para obtener agua y minerales, pero al mismo tiempo produce su propio alimento mediante la fotosíntesis gracias a la clorofila presente en sus hojas. Sus flores son tubulares y de color rojo.",
  },
  {
    pregunta: "¿Por qué es una planta hemiparásita?",
    respuesta:
      "El quintral se denomina hemiparásito porque depende parcialmente de otra planta (llamada hospedero). Mediante una estructura especializada denominada haustorio, penetra los tejidos del árbol. Sin embargo, como posee hojas verdes con clorofila, realiza fotosíntesis y produce sus propios azúcares. Por eso no es un parásito total.",
  },
  {
    pregunta: "¿Cómo se obtiene agua y nutrientes?",
    respuesta:
      "El quintral germina sobre una rama del hospedero y desarrolla un haustorio que atraviesa la corteza hasta alcanzar el xilema. A través de esta conexión obtiene agua, sales minerales y nutrientes inorgánicos. Con esos recursos, junto con la luz solar y el dióxido de carbono del aire, realiza fotosíntesis para fabricar su propio alimento.",
  },
  {
    pregunta: "¿Qué aves dispersan sus semillas?",
    respuesta:
      "El principal dispersor del quintral es el cometocino, que consume sus frutos y deposita las semillas intactas sobre las ramas de otros árboles. También participan otras aves frugívoras según la zona donde crece. Sus flores son polinizadas principalmente por el picaflor chico, que transporta el polen entre distintas flores mientras se alimenta de su néctar.",
  },
  {
    pregunta: "¿Qué árboles hospeda?",
    respuesta:
      "El quintral puede crecer sobre numerosas especies de árboles y arbustos, tanto nativos como introducidos. Algunos hospederos registrados son: maqui (Aristotelia chilensis), huayún (Rhaphithamnus spinosus), quillay (Quillaja saponaria), litre (Lithraea caustica), colliguay (Colliguaja odorifera), espino (Vachellia caven), peumo (Cryptocarya alba), boldo (Peumus boldus), álamo (Populus nigra), sauce (Salix babylonica) y aromo (Acacia dealbata). La disponibilidad de hospederos varía según la región y el tipo de bosque.",
  },
  {
    pregunta: "¿Dónde vive el quintral?",
    respuesta:
      "El quintral (Tristerix corymbosus) vive principalmente en Chile y parte de Argentina. En Chile se encuentra asociado al matorral chileno y al bosque templado valdiviano, creciendo sobre ramas de árboles y arbustos hospederos. Su presencia depende de la disponibilidad de hospederos, polinizadores y dispersores de semillas.",
  },
  {
    pregunta: "¿El quintral mata a los árboles?",
    respuesta:
      "No siempre. El quintral es una planta hemiparásita: obtiene agua y minerales del hospedero, pero también realiza fotosíntesis. En árboles sanos puede convivir sin causar la muerte inmediata; sin embargo, una carga alta de quintral puede debilitar al hospedero. Estudios recientes sugieren que puede afectar con mayor fuerza a algunas especies exóticas invasoras, como álamos y aromos.",
  },
  {
    pregunta: "¿Es una especie invasora?",
    respuesta:
      "No. El quintral es una especie nativa. Aunque parasita árboles, forma parte de los ecosistemas chilenos y cumple funciones ecológicas importantes. En ambientes alterados puede aumentar su presencia, pero eso no significa que sea invasora.",
  },
  {
    pregunta: "¿Tiene propiedades medicinales?",
    respuesta:
      "El quintral ha sido usado en medicina tradicional para problemas digestivos, colesterol alto, inflamación, cicatrización y otros usos populares. Sin embargo, estos usos no reemplazan tratamientos médicos. Actualmente se estudian sus compuestos bioactivos y su posible actividad antioxidante y antimicrobiana.",
  },
  {
    pregunta: "¿Qué compuestos fitoquímicos contiene?",
    respuesta:
      "Los estudios han reportado en el quintral la presencia de fenoles, flavonoides, terpenoides, esteroles, quinonas y glicósidos. También se han estudiado sus compuestos fenólicos, su capacidad antioxidante y su posible actividad antimicrobiana.",
  },
  {
    pregunta: "¿Qué importancia ecológica tiene?",
    respuesta:
      "El quintral entrega néctar a polinizadores, frutos a animales dispersores y genera interacciones entre plantas, aves y otros organismos. Por eso se considera una especie importante dentro de las redes ecológicas del matorral y del bosque templado.",
  },
  {
    pregunta: "¿Cómo reconocer un quintral en terreno?",
    respuesta:
      "Se reconoce porque crece sobre las ramas de otros árboles como una mata verde, densa y ramificada. Tiene hojas verdes, simples y opuestas. Sus flores suelen ser tubulares y de color rojo-anaranjado, y sus frutos son bayas pegajosas que ayudan a que la semilla se adhiera a nuevas ramas.",
  },
  {
    pregunta: "¿Cuál es la diferencia entre un quintral y un muérdago europeo?",
    respuesta:
      "Ambos son plantas parásitas o hemiparásitas que crecen sobre otros árboles, pero pertenecen a grupos distintos. El quintral chileno corresponde principalmente a Tristerix corymbosus, de la familia Loranthaceae, mientras que el muérdago europeo más conocido es Viscum album, de la familia Santalaceae. Además, tienen distinta distribución geográfica, hospederos y relaciones ecológicas.",
  },
  {
    pregunta: "¿Qué animales dependen del quintral?",
    respuesta:
      "En el matorral chileno, sus semillas pueden ser dispersadas por aves como la tenca (Mimus thenca), además de otras aves frugívoras como el fío-fío (Elaenia albiceps) y el zorzal (Turdus falcklandii). En bosques templados del sur, estudios indican que la dispersión puede depender de marsupiales arborícolas del género Dromiciops. Sus flores también son visitadas por picaflores, que actúan como polinizadores.",
  },
  {
    pregunta: "¿Cómo participar en la conservación de los bosques nativos?",
    respuesta:
      "Puedes ayudar registrando observaciones de quintral y sus hospederos, evitando cortar vegetación nativa, no extrayendo plantas completas, respetando senderos, previniendo incendios, retirando basura y difundiendo la importancia de las especies nativas. También puedes participar en actividades de ciencia ciudadana, reforestación con especies nativas y educación ambiental.",
  },
];
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/__tests__/faq.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/faq.ts src/lib/__tests__/faq.test.ts
git commit -m "feat: datos de FAQ curada del quintral (15 preguntas)"
```

---

## Task 2: Sección FAQ (`FaqSection.tsx`) + navegación

**Files:**
- Create: `src/components/FaqSection.tsx`
- Test: `src/components/__tests__/FaqSection.test.tsx`
- Modify: `src/components/Nav.tsx` (arreglo `SECTIONS` y enlace)
- Modify: `src/components/HomeClient.tsx` (render de `FaqSection`)
- Modify: `src/components/ContributeForm.tsx:140` (`data-num="05"` → `data-num="06"`)
- Modify: `src/app/globals.css` (estilos de acordeón, al final del archivo)

**Interfaces:**
- Consumes: `FAQ` de `@/lib/faq`.
- Produces: `export default function FaqSection(): JSX.Element` — renderiza `<section id="preguntas">`.

- [ ] **Step 1: Escribir el test que falla**

```tsx
// src/components/__tests__/FaqSection.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FaqSection from "@/components/FaqSection";
import { FAQ } from "@/lib/faq";

describe("FaqSection", () => {
  it("renderiza el encabezado y una entrada por cada pregunta", () => {
    render(<FaqSection />);
    expect(
      screen.getByRole("heading", { name: /preguntas frecuentes/i }),
    ).toBeInTheDocument();
    for (const item of FAQ) {
      expect(screen.getByText(item.pregunta)).toBeInTheDocument();
    }
  });

  it("expone la sección con id 'preguntas'", () => {
    const { container } = render(<FaqSection />);
    expect(container.querySelector("section#preguntas")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/components/__tests__/FaqSection.test.tsx`
Expected: FAIL (`Cannot find module '@/components/FaqSection'`).

- [ ] **Step 3: Crear `src/components/FaqSection.tsx`**

```tsx
"use client";
import { FAQ } from "@/lib/faq";

export default function FaqSection() {
  return (
    <section id="preguntas" className="section">
      <div className="section-head">
        <p className="kicker" data-num="05">
          Asistente científico
        </p>
        <h2>Preguntas frecuentes sobre el quintral</h2>
        <p>
          Respuestas breves y verificadas sobre la biología, ecología y usos del
          quintral. Disponibles sin conexión para consultarlas en terreno.
        </p>
      </div>

      <ul className="faq-list">
        {FAQ.map((item) => (
          <li key={item.pregunta} className="card faq-item">
            <details>
              <summary>{item.pregunta}</summary>
              <p>{item.respuesta}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/components/__tests__/FaqSection.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Añadir estilos de acordeón al final de `src/app/globals.css`**

```css
.faq-list {
  list-style: none;
  display: grid;
  gap: 0.75rem;
}
.faq-item {
  padding: 0;
}
.faq-item summary {
  cursor: pointer;
  padding: 1rem 1.25rem;
  font-weight: 600;
  list-style: none;
}
.faq-item summary::-webkit-details-marker {
  display: none;
}
.faq-item summary::after {
  content: "+";
  float: right;
  font-weight: 400;
  opacity: 0.6;
}
.faq-item details[open] summary::after {
  content: "–";
}
.faq-item details > p {
  padding: 0 1.25rem 1.15rem;
  margin: 0;
}
```

- [ ] **Step 6: Registrar la sección en la navegación (`src/components/Nav.tsx`)**

En la línea 5, añadir `"preguntas"` antes de `"aportar"`:

```tsx
const SECTIONS = ["identificar", "mapa", "comparar", "predecir", "preguntas", "aportar"] as const;
```

En el bloque de enlaces (líneas 78-84), insertar el enlace de Preguntas antes de Ciencia ciudadana:

```tsx
        <div id="nav-menu" className={`nav-links${open ? " nav-links--open" : ""}`}>
          {link("#identificar", "Identificar")}
          {link("#mapa", "Mapa")}
          {link("#comparar", "Compuestos")}
          {link("#predecir", "Predicción")}
          {link("#preguntas", "Preguntas")}
          {link("#aportar", "Ciencia ciudadana")}
        </div>
```

- [ ] **Step 7: Renderizar `FaqSection` en `src/components/HomeClient.tsx`**

Añadir el import junto a los demás componentes:

```tsx
import FaqSection from "@/components/FaqSection";
```

Y colocar `<FaqSection />` entre `<PrediccionSection />` y `<ContributeForm ... />`:

```tsx
      <PrediccionSection />
      <FaqSection />
      <ContributeForm prefill={prefill} onQueue={encolar} />
```

- [ ] **Step 8: Actualizar el número del kicker de Ciencia ciudadana (`src/components/ContributeForm.tsx:140`)**

```tsx
        <p className="kicker" data-num="06">Ciencia ciudadana</p>
```

- [ ] **Step 9: Correr toda la suite y el typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (sin errores de tipos; los tests nuevos y existentes pasan salvo `CompararSection.test.tsx`, que se corrige en la Task 7).

- [ ] **Step 10: Commit**

```bash
git add src/components/FaqSection.tsx src/components/__tests__/FaqSection.test.tsx src/components/Nav.tsx src/components/HomeClient.tsx src/components/ContributeForm.tsx src/app/globals.css
git commit -m "feat: sección Preguntas (FAQ curada offline) en la navegación"
```

---

## Task 3: Datos de la biblioteca fitoquímica (`bibliotecaFito.ts`)

**Files:**
- Create: `src/lib/bibliotecaFito.ts`
- Test: `src/lib/__tests__/bibliotecaFito.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  ```ts
  interface EstudioFito { cita: string; descripcion: string; url: string }
  interface FichaCompuesto {
    id: string;
    nombre: string;
    queEs: string;
    funcionEnPlanta: string[];
    aplicacionesBiomedicas: string[];
    presenteEnQuintral: true;
    estudios: EstudioFito[];
  }
  export const BIBLIOTECA: FichaCompuesto[]; // 6 fichas
  ```

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/__tests__/bibliotecaFito.test.ts
import { describe, it, expect } from "vitest";
import { BIBLIOTECA } from "@/lib/bibliotecaFito";

describe("BIBLIOTECA fitoquímica", () => {
  it("tiene las 6 fichas esperadas", () => {
    expect(BIBLIOTECA.map((c) => c.id)).toEqual([
      "polifenoles",
      "flavonoides",
      "terpenoides",
      "quinonas",
      "esteroles",
      "glicosidos",
    ]);
  });

  it("cada ficha está completa y marcada como presente en el quintral", () => {
    for (const ficha of BIBLIOTECA) {
      expect(ficha.nombre.trim().length).toBeGreaterThan(0);
      expect(ficha.queEs.trim().length).toBeGreaterThan(0);
      expect(ficha.funcionEnPlanta.length).toBeGreaterThan(0);
      expect(ficha.aplicacionesBiomedicas.length).toBeGreaterThan(0);
      expect(ficha.presenteEnQuintral).toBe(true);
      expect(ficha.estudios.length).toBeGreaterThan(0);
      for (const e of ficha.estudios) {
        expect(e.url).toMatch(/^https:\/\//);
        expect(e.url).not.toContain("utm_source");
      }
    }
  });

  it("polifenoles y flavonoides citan a Torres y Simirgiotis", () => {
    const poli = BIBLIOTECA.find((c) => c.id === "polifenoles")!;
    const citas = poli.estudios.map((e) => e.cita);
    expect(citas.some((c) => c.includes("Torres"))).toBe(true);
    expect(citas.some((c) => c.includes("Simirgiotis"))).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/lib/__tests__/bibliotecaFito.test.ts`
Expected: FAIL (`Cannot find module '@/lib/bibliotecaFito'`).

- [ ] **Step 3: Crear `src/lib/bibliotecaFito.ts`**

```ts
export interface EstudioFito {
  cita: string;
  descripcion: string;
  url: string;
}

export interface FichaCompuesto {
  id: string;
  nombre: string;
  queEs: string;
  funcionEnPlanta: string[];
  aplicacionesBiomedicas: string[];
  presenteEnQuintral: true;
  estudios: EstudioFito[];
}

const TORRES_2019 =
  "https://www.scielo.cl/article_plus.php?lng=es&pid=S0717-97072019000404645&tlng=en";
const SIMIRGIOTIS_2016 =
  "https://researchers.unab.cl/en/publications/phenolic-compounds-in-chilean-mistletoe-quintral-tristerix-tetran/";

export const BIBLIOTECA: FichaCompuesto[] = [
  {
    id: "polifenoles",
    nombre: "Polifenoles",
    queEs:
      "Los polifenoles son un amplio grupo de compuestos naturales producidos por las plantas. Se caracterizan por tener uno o más grupos fenólicos y participar en la defensa frente a factores ambientales.",
    funcionEnPlanta: [
      "Actúan como antioxidantes.",
      "Protegen frente a la radiación UV.",
      "Ayudan a defender la planta de hongos, bacterias e insectos.",
      "Participan en la respuesta al estrés ambiental.",
    ],
    aplicacionesBiomedicas: [
      "Antioxidante.",
      "Antiinflamatoria.",
      "Antimicrobiana.",
      "Cardioprotectora.",
      "Neuroprotectora.",
      "Anticancerígena.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion:
          "Determina el poder reductor y el perfil fitoquímico del quintral hospedado en maqui, huayún y álamo: fenoles totales, flavonoides totales, poder antioxidante y comparación entre hospederos.",
        url: TORRES_2019,
      },
      {
        cita: "Simirgiotis et al. (2016)",
        descripcion:
          "Usa UHPLC-Orbitrap-MS para identificar compuestos fenólicos en el muérdago chileno: ácido clorogénico, ácido feruloilquínico, quercetina, luteolina, apigenina, isoramnetina y otros.",
        url: SIMIRGIOTIS_2016,
      },
    ],
  },
  {
    id: "flavonoides",
    nombre: "Flavonoides",
    queEs:
      "Los flavonoides son un subgrupo de los polifenoles responsables de muchos de los colores presentes en flores, hojas y frutos.",
    funcionEnPlanta: [
      "Protegen frente a la radiación solar.",
      "Favorecen la polinización al aportar color a las flores.",
      "Actúan como antioxidantes.",
      "Participan en mecanismos de defensa frente a microorganismos.",
    ],
    aplicacionesBiomedicas: [
      "Antioxidante.",
      "Antiinflamatoria.",
      "Antivírica.",
      "Antibacteriana.",
      "Antidiabética.",
      "Protectora del sistema cardiovascular.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion: "Cuantifica flavonoides totales en hojas y flores.",
        url: TORRES_2019,
      },
      {
        cita: "Simirgiotis et al. (2016)",
        descripcion:
          "Identifica flavonoides específicos mediante espectrometría de masas.",
        url: SIMIRGIOTIS_2016,
      },
    ],
  },
  {
    id: "terpenoides",
    nombre: "Terpenoides",
    queEs:
      "Los terpenoides constituyen uno de los grupos más diversos de metabolitos secundarios de las plantas.",
    funcionEnPlanta: [
      "Forman parte de aceites esenciales y resinas.",
      "Protegen frente a insectos herbívoros.",
      "Ayudan a atraer polinizadores mediante aromas.",
      "Participan en la comunicación química entre plantas.",
    ],
    aplicacionesBiomedicas: [
      "Antimicrobiana.",
      "Antifúngica.",
      "Antiparasitaria.",
      "Antiinflamatoria.",
      "Antitumoral.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion:
          "Tamizaje fitoquímico cualitativo que confirma la presencia de terpenoides (no los cuantifica).",
        url: TORRES_2019,
      },
    ],
  },
  {
    id: "quinonas",
    nombre: "Quinonas",
    queEs:
      "Las quinonas son compuestos aromáticos presentes en numerosas especies vegetales.",
    funcionEnPlanta: [
      "Actúan como mecanismo de defensa química.",
      "Protegen frente a bacterias y hongos.",
      "Participan en procesos de oxidación y reducción.",
    ],
    aplicacionesBiomedicas: [
      "Antibacteriana.",
      "Antifúngica.",
      "Antivírica.",
      "Anticancerígena.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion: "Reporta presencia positiva mediante tamizaje fitoquímico.",
        url: TORRES_2019,
      },
    ],
  },
  {
    id: "esteroles",
    nombre: "Esteroles",
    queEs:
      "Los esteroles vegetales (fitosteroles) son lípidos estructurales presentes en las membranas celulares de las plantas.",
    funcionEnPlanta: [
      "Mantienen la estabilidad de las membranas celulares.",
      "Favorecen el crecimiento y desarrollo vegetal.",
      "Participan en procesos hormonales.",
    ],
    aplicacionesBiomedicas: [
      "Disminución del colesterol LDL.",
      "Salud cardiovascular.",
      "Actividad antiinflamatoria.",
      "Regulación del sistema inmunológico.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion:
          "Detecta esteroles en extractos del quintral mediante pruebas cualitativas.",
        url: TORRES_2019,
      },
    ],
  },
  {
    id: "glicosidos",
    nombre: "Glicósidos",
    queEs:
      "Los glicósidos son moléculas formadas por un azúcar unido a otro compuesto químico (aglicona). Existen distintos tipos, como los glicósidos cardíacos, fenólicos y flavonoides.",
    funcionEnPlanta: [
      "Defensa frente a herbívoros.",
      "Almacenamiento de compuestos activos.",
      "Participación en la respuesta al estrés.",
    ],
    aplicacionesBiomedicas: [
      "Cardiotónica.",
      "Antioxidante.",
      "Antiinflamatoria.",
      "Antimicrobiana.",
      "Anticancerígena.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion: "Identifica glicósidos durante el análisis fitoquímico.",
        url: TORRES_2019,
      },
    ],
  },
];
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/__tests__/bibliotecaFito.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bibliotecaFito.ts src/lib/__tests__/bibliotecaFito.test.ts
git commit -m "feat: datos de biblioteca fitoquímica (6 compuestos + estudios)"
```

---

## Task 4: Componente biblioteca fitoquímica (`BibliotecaFito.tsx`)

**Files:**
- Create: `src/components/BibliotecaFito.tsx`
- Test: `src/components/__tests__/BibliotecaFito.test.tsx`
- Modify: `src/app/globals.css` (estilos de ficha, al final)

**Interfaces:**
- Consumes: `BIBLIOTECA` de `@/lib/bibliotecaFito`.
- Produces: `export default function BibliotecaFito(): JSX.Element` — bloque (sin `<section>` propio; se inserta dentro de `CompararSection`).

- [ ] **Step 1: Escribir el test que falla**

```tsx
// src/components/__tests__/BibliotecaFito.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BibliotecaFito from "@/components/BibliotecaFito";

describe("BibliotecaFito", () => {
  it("muestra los 6 compuestos y su presencia en el quintral", () => {
    render(<BibliotecaFito />);
    expect(screen.getByText("Polifenoles")).toBeInTheDocument();
    expect(screen.getByText("Glicósidos")).toBeInTheDocument();
    // el botón/resumen de presencia aparece una vez por ficha
    expect(
      screen.getAllByText(/¿está presente en el quintral\?/i).length,
    ).toBe(6);
  });

  it("incluye enlaces a los estudios científicos", () => {
    render(<BibliotecaFito />);
    const enlaces = screen.getAllByRole("link", { name: /ver estudio|scielo|Torres|Simirgiotis/i });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/components/__tests__/BibliotecaFito.test.tsx`
Expected: FAIL (`Cannot find module '@/components/BibliotecaFito'`).

- [ ] **Step 3: Crear `src/components/BibliotecaFito.tsx`**

```tsx
"use client";
import { BIBLIOTECA } from "@/lib/bibliotecaFito";

export default function BibliotecaFito() {
  return (
    <div className="biblioteca">
      <h3 className="biblioteca-titulo">Biblioteca fitoquímica</h3>
      <p className="biblioteca-intro">
        Cada compuesto detectado en el quintral, con su función en la planta, las
        aplicaciones biomédicas que se investigan y los estudios que lo respaldan.
      </p>

      <div className="biblioteca-grid">
        {BIBLIOTECA.map((ficha) => (
          <article key={ficha.id} className="card card-pad ficha">
            <h4 className="ficha-nombre">{ficha.nombre}</h4>

            <p className="ficha-label">¿Qué es?</p>
            <p>{ficha.queEs}</p>

            <p className="ficha-label">¿Qué función tiene en la planta?</p>
            <ul className="ficha-lista">
              {ficha.funcionEnPlanta.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <p className="ficha-label">¿Qué aplicaciones biomédicas se estudian?</p>
            <ul className="ficha-lista">
              {ficha.aplicacionesBiomedicas.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>

            <details className="ficha-presencia">
              <summary>¿Está presente en el quintral?</summary>
              <p className="alert alert--ok">✅ Sí, detectado en el quintral.</p>
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

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/components/__tests__/BibliotecaFito.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Añadir estilos de ficha al final de `src/app/globals.css`**

```css
.biblioteca {
  margin-top: 2.5rem;
}
.biblioteca-titulo {
  margin: 0 0 0.35rem;
}
.biblioteca-intro {
  margin: 0 0 1.25rem;
  max-width: 60ch;
}
.biblioteca-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
}
.ficha-nombre {
  margin: 0 0 0.75rem;
}
.ficha-label {
  font-weight: 600;
  margin: 0.9rem 0 0.25rem;
}
.ficha-lista {
  margin: 0;
  padding-left: 1.1rem;
}
.ficha-presencia summary {
  cursor: pointer;
  font-weight: 600;
  margin-top: 1rem;
}
.ficha-estudios {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.5rem;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/BibliotecaFito.tsx src/components/__tests__/BibliotecaFito.test.tsx src/app/globals.css
git commit -m "feat: componente de biblioteca fitoquímica con fichas y estudios"
```

---

## Task 5: Datos de evidencia antimicrobiana (`antimicrobiano.ts`)

**Files:**
- Create: `src/lib/antimicrobiano.ts`
- Test: `src/lib/__tests__/antimicrobiano.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  ```ts
  interface ResultadoBacteria { bacteria: string; inhibicion: false }
  export const RESULTADOS: ResultadoBacteria[];        // 3 bacterias
  export const CONCENTRACIONES: number[];              // µg/mL
  export const CONTROL_POSITIVO: string;
  export const CONTROL_NEGATIVO: string;
  export const HOSPEDEROS_ENSAYADOS: string[];
  export const NOTA_LITERATURA: string;
  export const FACTORES: string[];
  export const LINEAS_FUTURAS: string[];
  export const APRENDIZAJE: string;
  ```

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/__tests__/antimicrobiano.test.ts
import { describe, it, expect } from "vitest";
import {
  RESULTADOS,
  CONCENTRACIONES,
  CONTROL_POSITIVO,
  FACTORES,
  LINEAS_FUTURAS,
  APRENDIZAJE,
} from "@/lib/antimicrobiano";

describe("evidencia antimicrobiana", () => {
  it("registra las 3 bacterias, todas sin inhibición", () => {
    expect(RESULTADOS.map((r) => r.bacteria)).toEqual([
      "Escherichia coli ATCC 25922",
      "Staphylococcus aureus ATCC 25923",
      "Enterococcus faecalis ATCC 29212",
    ]);
    expect(RESULTADOS.every((r) => r.inhibicion === false)).toBe(true);
  });

  it("documenta las concentraciones ensayadas y el control", () => {
    expect(CONCENTRACIONES).toEqual([128, 256, 512, 1024]);
    expect(CONTROL_POSITIVO).toMatch(/ampicilina/i);
  });

  it("aporta factores, líneas futuras y aprendizaje", () => {
    expect(FACTORES.length).toBeGreaterThan(0);
    expect(LINEAS_FUTURAS.length).toBeGreaterThan(0);
    expect(APRENDIZAJE.trim().length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/lib/__tests__/antimicrobiano.test.ts`
Expected: FAIL (`Cannot find module '@/lib/antimicrobiano'`).

- [ ] **Step 3: Crear `src/lib/antimicrobiano.ts`**

```ts
export interface ResultadoBacteria {
  bacteria: string;
  inhibicion: false;
}

export const RESULTADOS: ResultadoBacteria[] = [
  { bacteria: "Escherichia coli ATCC 25922", inhibicion: false },
  { bacteria: "Staphylococcus aureus ATCC 25923", inhibicion: false },
  { bacteria: "Enterococcus faecalis ATCC 29212", inhibicion: false },
];

export const CONCENTRACIONES = [128, 256, 512, 1024]; // µg/mL
export const CONTROL_POSITIVO = "ampicilina";
export const CONTROL_NEGATIVO = "medio de cultivo";
export const HOSPEDEROS_ENSAYADOS = ["litre", "quillay"];

export const NOTA_LITERATURA =
  "La literatura ha evaluado la actividad antimicrobiana del quintral frente a " +
  "Escherichia coli (Gram negativa), Staphylococcus aureus (Gram positiva) y " +
  "Enterococcus faecalis (Gram positiva). Los resultados publicados no son uniformes: " +
  "algunos estudios reportan actividad según el hospedero, el solvente de extracción, " +
  "la parte de la planta y la concentración del extracto. Por eso sigue siendo un tema " +
  "de investigación en desarrollo.";

export const FACTORES = [
  "La especie del árbol hospedero.",
  "La concentración del extracto.",
  "El solvente de extracción utilizado.",
  "La parte de la planta analizada (hojas, flores o frutos).",
  "La especie bacteriana evaluada.",
];

export const LINEAS_FUTURAS = [
  "Comparar el quintral hospedado en otras especies nativas e introducidas.",
  "Analizar el contenido de polifenoles y flavonoides antes de los ensayos antimicrobianos.",
  "Evaluar otros métodos de extracción (metanol, acetona o extracción asistida por ultrasonido).",
  "Ensayar concentraciones mayores o extractos fraccionados.",
  "Evaluar otras bacterias de interés clínico o ambiental.",
  "Identificar mediante HPLC-MS o LC-MS los compuestos responsables de la actividad biológica.",
];

export const APRENDIZAJE =
  "Los extractos etanólicos de quintral hospedado en litre y quillay no mostraron " +
  "actividad antimicrobiana frente a E. coli, S. aureus y E. faecalis en las condiciones " +
  "evaluadas. Este resultado aporta evidencia científica valiosa y orienta futuras " +
  "investigaciones hacia otros hospederos, métodos de extracción o concentraciones, " +
  "demostrando que la ausencia de efecto también contribuye al conocimiento científico.";
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/__tests__/antimicrobiano.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/antimicrobiano.ts src/lib/__tests__/antimicrobiano.test.ts
git commit -m "feat: datos de evidencia antimicrobiana del proyecto 2026"
```

---

## Task 6: Componente evidencia antimicrobiana (`EvidenciaAntimicrobiana.tsx`)

**Files:**
- Create: `src/components/EvidenciaAntimicrobiana.tsx`
- Test: `src/components/__tests__/EvidenciaAntimicrobiana.test.tsx`
- Modify: `src/app/globals.css` (estilos, al final; opcional si basta con clases existentes)

**Interfaces:**
- Consumes: `RESULTADOS, CONCENTRACIONES, CONTROL_POSITIVO, CONTROL_NEGATIVO, HOSPEDEROS_ENSAYADOS, NOTA_LITERATURA, FACTORES, LINEAS_FUTURAS, APRENDIZAJE` de `@/lib/antimicrobiano`.
- Produces: `export default function EvidenciaAntimicrobiana(): JSX.Element` — bloque (sin `<section>` propio).

- [ ] **Step 1: Escribir el test que falla**

```tsx
// src/components/__tests__/EvidenciaAntimicrobiana.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EvidenciaAntimicrobiana from "@/components/EvidenciaAntimicrobiana";

describe("EvidenciaAntimicrobiana", () => {
  it("muestra las 3 bacterias y el resultado sin inhibición", () => {
    render(<EvidenciaAntimicrobiana />);
    expect(screen.getByText(/Escherichia coli ATCC 25922/)).toBeInTheDocument();
    expect(screen.getByText(/Staphylococcus aureus ATCC 25923/)).toBeInTheDocument();
    expect(screen.getByText(/Enterococcus faecalis ATCC 29212/)).toBeInTheDocument();
    expect(screen.getAllByText(/sin inhibición/i).length).toBe(3);
  });

  it("presenta las líneas futuras y el aprendizaje", () => {
    render(<EvidenciaAntimicrobiana />);
    expect(
      screen.getByRole("heading", { name: /qué aprendimos/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no mostraron actividad antimicrobiana/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/components/__tests__/EvidenciaAntimicrobiana.test.tsx`
Expected: FAIL (`Cannot find module '@/components/EvidenciaAntimicrobiana'`).

- [ ] **Step 3: Crear `src/components/EvidenciaAntimicrobiana.tsx`**

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
      <p className="biblioteca-intro">{NOTA_LITERATURA}</p>

      <div className="card card-pad">
        <h4>Resultados de Quintral Insight (proyecto 2026)</h4>
        <p>
          Se evaluaron extractos etanólicos de quintral hospedado en{" "}
          {HOSPEDEROS_ENSAYADOS.join(" y ")} frente a tres bacterias de referencia.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Bacteria</th>
              <th scope="col">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {RESULTADOS.map((r) => (
              <tr key={r.bacteria}>
                <th scope="row">{r.bacteria}</th>
                <td>❌ Sin inhibición del crecimiento</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="data-source">
          Concentraciones ensayadas: {CONCENTRACIONES.join(", ")} µg/mL. Control
          positivo: {CONTROL_POSITIVO}; control negativo: {CONTROL_NEGATIVO}. Los
          antibiogramas a 1024 µg/mL no mostraron halos de inhibición para ninguna
          bacteria, mientras que el control con {CONTROL_POSITIVO} sí presentó
          actividad.
        </p>
      </div>

      <div className="antimicrobiano-cols">
        <div className="card card-pad">
          <h4>Factores que pueden influir</h4>
          <p>La ausencia de actividad no significa que el quintral no tenga compuestos bioactivos. Pueden influir:</p>
          <ul className="ficha-lista">
            {FACTORES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="card card-pad">
          <h4>Investigaciones que continúan</h4>
          <ul className="ficha-lista">
            {LINEAS_FUTURAS.map((l) => (
              <li key={l}>🔬 {l}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card card-pad">
        <h4>¿Qué aprendimos?</h4>
        <p className="alert alert--ok">{APRENDIZAJE}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/components/__tests__/EvidenciaAntimicrobiana.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Añadir estilos al final de `src/app/globals.css`**

```css
.antimicrobiano {
  margin-top: 2.5rem;
}
.antimicrobiano-cols {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  margin: 1rem 0;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/EvidenciaAntimicrobiana.tsx src/components/__tests__/EvidenciaAntimicrobiana.test.tsx src/app/globals.css
git commit -m "feat: componente de evidencia antimicrobiana 2026"
```

---

## Task 7: Integrar en la sección Compuestos y actualizar copy

**Files:**
- Modify: `src/components/CompararSection.tsx`
- Modify: `src/components/__tests__/CompararSection.test.tsx` (corregir el test roto por el título actual)

**Interfaces:**
- Consumes: `BibliotecaFito` de `@/components/BibliotecaFito`; `EvidenciaAntimicrobiana` de `@/components/EvidenciaAntimicrobiana`.
- Produces: nada nuevo (integración).

**Contexto:** `CompararSection.test.tsx` ya está **fallando** en el working copy porque el título del componente cambió a "Perfil fitoquímico del quintral (datos 2025)" pero el test aún espera "Comparar compuestos entre hospederos". Esta tarea deja el test alineado con el componente.

- [ ] **Step 1: Actualizar el test de `CompararSection` para reflejar el estado real**

Reemplazar el contenido de `src/components/__tests__/CompararSection.test.tsx` por:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompararSection from "@/components/CompararSection";

describe("CompararSection", () => {
  it("muestra el título, la tabla con datos reales y antocianinas n/d", () => {
    render(<CompararSection />);
    expect(
      screen.getByRole("heading", {
        name: /perfil fitoquímico del quintral/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/S-218-25/)).toBeInTheDocument();
    expect(screen.getAllByText("n/d").length).toBeGreaterThan(0);
  });

  it("incluye la biblioteca fitoquímica y la evidencia antimicrobiana", () => {
    render(<CompararSection />);
    expect(
      screen.getByRole("heading", { name: /biblioteca fitoquímica/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /evidencia sobre actividad antimicrobiana/i }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla por la parte nueva**

Run: `npx vitest run src/components/__tests__/CompararSection.test.tsx`
Expected: FAIL (no encuentra los encabezados "Biblioteca fitoquímica" / "Evidencia sobre actividad antimicrobiana").

- [ ] **Step 3: Insertar los componentes y actualizar el copy en `src/components/CompararSection.tsx`**

Añadir los imports tras la línea 8:

```tsx
import BibliotecaFito from "@/components/BibliotecaFito";
import EvidenciaAntimicrobiana from "@/components/EvidenciaAntimicrobiana";
```

Actualizar el párrafo de introducción (líneas 34-39) para enlazar con la evidencia 2026:

```tsx
        <p>
          Dos muestras reales de laboratorio del quintral medidas en 2025 y una
          biblioteca de los compuestos detectados en la especie. En 2026 sumamos
          evidencia experimental sobre su actividad antimicrobiana. La comparación
          cuantitativa entre hospederos sigue siendo un objetivo abierto.
        </p>
```

Insertar los dos componentes justo antes de cerrar la `</section>` (tras el `</div>` que cierra `chart-grid`, línea 86):

```tsx
      </div>

      <BibliotecaFito />
      <EvidenciaAntimicrobiana />
    </section>
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/components/__tests__/CompararSection.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Correr toda la suite y el typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS en todo, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add src/components/CompararSection.tsx src/components/__tests__/CompararSection.test.tsx
git commit -m "feat: integrar biblioteca y evidencia antimicrobiana en Compuestos"
```

---

## Task 8: Verificación end-to-end en el navegador

**Files:** ninguno (verificación).

- [ ] **Step 1: Levantar la app**

Run: `npm run dev`
Abrir `http://localhost:3000`.

- [ ] **Step 2: Verificar manualmente**

- El menú muestra "Preguntas" entre Predicción y Ciencia ciudadana; el enlace baja a la sección.
- La sección Preguntas lista las 15 preguntas; al hacer clic se despliega la respuesta.
- En Compuestos aparecen la biblioteca (6 fichas) y la evidencia antimicrobiana (tabla + bloques).
- En una ficha, "¿Está presente en el quintral?" revela "✅ Sí" y los enlaces "Ver estudio" abren en pestaña nueva.
- Sin errores en la consola del navegador.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: build exitoso sin errores.

---

## Self-Review (autor del plan)

**Cobertura del spec:**
- FAQ curada offline → Task 1 (datos) + Task 2 (sección + nav). ✅
- Biblioteca fitoquímica (6 fichas, presencia, estudios) → Task 3 + Task 4. ✅
- Evidencia antimicrobiana 2026 → Task 5 + Task 6. ✅
- Ubicación (FAQ nueva sección; resto en Compuestos) → Task 2 (nav) + Task 7 (integración). ✅
- Actualización de copy de Compuestos → Task 7. ✅
- Sin backend/API nueva; offline; enlaces externos con `rel=noopener` → respetado en Tasks 4 y 6. ✅
- Tests (integridad de datos + render smoke) → cada task incluye ambos. ✅

**Consistencia de tipos:** `PreguntaFaq`, `FichaCompuesto`/`EstudioFito`, `ResultadoBacteria` y todos los `export const` se usan con los mismos nombres en componentes y tests. IDs de biblioteca (`polifenoles, flavonoides, terpenoides, quinonas, esteroles, glicosidos`) coinciden entre datos y test. ✅

**Sin placeholders:** todo el contenido está escrito verbatim; no hay TBD/TODO. ✅
