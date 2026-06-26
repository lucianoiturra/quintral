# Diseño — Secciones de fitoquímica (Quintral Insight)

Fecha: 2026-06-25
Estado: aprobado para implementación tras revisión del usuario

## Objetivo

Construir las dos secciones de la fase 2 (fitoquímica) del comp `Documentación/App web.pdf`,
hoy pendientes:

1. **"Comparar compuestos entre hospederos"** — gráfico de radar.
2. **"Predicción fitoquímica del ejemplar"** — formulario + gráfico de barras.

Ambas se montan en la home (`HomeClient`) siguiendo los patrones de sección
existentes (`IdentifySection`, `MapSection`, `ContributeForm`) y el sistema de
diseño de `src/app/globals.css`.

## Principio rector: honestidad de datos

PRODUCT.md exige ser "honestos sobre la incertidumbre" ante el jurado. **No se
inventan valores fitoquímicos.** Todo número mostrado tiene procedencia explícita
(`medido` / `literatura`) y los valores no determinados se rotulan "n/d", nunca
se ocultan ni se rellenan.

### Datos reales disponibles (estudio propio 2025)

Medidos en laboratorio sobre dos muestras compuestas de quintral (hojas, tallos y
algunas semillas), en base seca. Fuente: informe oficial del laboratorio e imagen
del gráfico, ambos incrustados en `Documentación/Proyecto Ciencias 2025 escrito.docx`:

| Compuesto            | Muestra 1 (S-218-25) | Muestra 2 (S-219-25) | Unidad        |
|----------------------|----------------------|----------------------|---------------|
| Polifenoles totales  | 52,8                 | 52,8                 | mg EAG/g      |
| Flavonoides totales  | 50,0                 | 49,5                 | mg QE/g       |
| Antocianinas totales | n/d (indeterminado)  | n/d (indeterminado)  | mg Cy3Glu/g   |

- Códigos internos de laboratorio: S-218-25 (Muestra 1), S-219-25 (Muestra 2).
- Unidades: EAG = equivalente ácido gálico; QE = equivalente quercetina;
  Cy3Glu = cianidina-3-glucósido.
- Antocianinas: indeterminadas (bajo el límite de detección del método).
- El laboratorio "no se responsabiliza por la toma de muestra" (controlar en 2026).
- El informe propio ya presenta un **bar chart** comparando Muestra 1 vs Muestra 2;
  el radar de la sección 1 es una reexpresión visual de esa misma comparación real.
- **Las muestras NO se separaron por hospedero**: la variación por hospedero
  aún no está medida (objetivo fase 2026).
- "Poder reductor" (antioxidante) **no se midió** en este estudio.

### Datos de literatura

Torres et al. (INACAP, Chile) se cita de forma **únicamente cualitativa**:
observaron diferencias en fenoles, flavonoides y poder reductor según el hospedero
(maqui, huayún, álamo). **No hay valores numéricos** en la fuente disponible, por
lo que no se grafican series numéricas de literatura. Se usa solo como nota/cita
cualitativa que contextualiza la dependencia del hospedero.

## Enfoque técnico

**Gráficos en SVG propio, sin dependencia nueva.**

- El proyecto no tiene librerías de charting; un radar y un bar chart son geometría
  simple.
- SVG propio da control total del estilo de marca (tokens oklch, fuentes
  Spectral/Hanken) y de la accesibilidad (tabla de datos paralela, `aria`,
  `prefers-reduced-motion`), y no depende solo del color (requisito WCAG AA).
- Se descarta recharts/chart.js: peso (~50–150 kB), accesibilidad pobre y estética
  genérica que choca con las anti-referencias de PRODUCT.md.

## Modelo de datos — `src/lib/fitoquimica.ts`

Única fuente de verdad tipada con procedencia explícita.

```ts
export type Compuesto = "polifenoles" | "flavonoides" | "antocianinas";

export interface MetaCompuesto {
  id: Compuesto;
  etiqueta: string;     // "Polifenoles totales"
  unidad: string;       // "mg EAG/g"
}

export type Fuente = "medido" | "literatura";

export interface MuestraFito {
  id: string;           // "muestra-1"
  etiqueta: string;     // "Muestra 1"
  codigo: string;       // "S-218-25" (código interno de laboratorio)
  fuente: Fuente;       // "medido"
  cita: string;         // "Estudio propio 2025"
  // null = no determinado (n/d)
  valores: Record<Compuesto, number | null>;
}

export const COMPUESTOS: MetaCompuesto[];   // orden de ejes/barras
export const MUESTRAS: MuestraFito[];        // muestra-1, muestra-2 (datos reales)
export const PERFIL_REFERENCIA: Record<Compuesto, number | null>; // promedio para predicción
export const NOTA_LITERATURA: string;        // cita cualitativa Torres et al.

// Helpers puros (testeables):
export function promedioCompuesto(c: Compuesto): number | null;
export function maxCompuesto(c: Compuesto): number; // para normalizar ejes del radar
```

Valores cargados (reales): polifenoles 52,8/52,8 · flavonoides 50,0/49,5 ·
antocianinas null/null. `PERFIL_REFERENCIA` = promedio: polifenoles 52,8,
flavonoides 49,75, antocianinas null.

## Componente `RadarChart` — `src/components/RadarChart.tsx`

SVG genérico y reutilizable.

- **Props**: `ejes` (etiquetas + unidad), `series` (nombre, color, valores
  normalizados 0–1, con `null` permitido), `size`.
- 3 ejes: Polifenoles, Flavonoides, Antocianinas. Normalización por eje contra
  `maxCompuesto` (cada eje a su propia escala; el bar chart muestra valores
  absolutos).
- Valores `null` (antocianinas): el vértice se ancla en el origen y se rotula
  "n/d" sobre el eje; la línea hacia ese vértice se dibuja punteada para no
  sugerir un valor medido.
- Rejilla concéntrica, etiquetas de eje, leyenda con color **y** forma (no solo
  color). Sin animación si `prefers-reduced-motion`.
- `role="img"` + `aria-label` descriptivo; la tabla de datos adyacente es el
  equivalente accesible.

## Componente `BarChart` — `src/components/BarChart.tsx`

SVG genérico y reutilizable.

- **Props**: `barras` (etiqueta, valor `number | null`, unidad, color), `size`.
- Valor encima de cada barra con su unidad; barra `null` se dibuja rayada con
  rótulo "n/d".
- Eje Y con escala y gridlines suaves; `role="img"` + `aria-label`; tabla
  adyacente como equivalente accesible. Respeta `prefers-reduced-motion`.

## Sección 1 — `CompararSection.tsx`

- `<section id="comparar" className="section">`, kicker `data-num="03"`:
  "Análisis fitoquímico" / H2 **"Comparar compuestos entre hospederos"**.
- **Subtítulo honesto** (`.section-head p`): explica el estado real — aún no hay
  mediciones separadas por hospedero; se muestra el perfil fitoquímico medido del
  quintral (2 muestras reales) y la evidencia cualitativa de dependencia del
  hospedero. La comparación numérica entre hospederos es el objetivo de la fase 2026.
  El título nombra el propósito de la sección; el cuerpo es escrupulosamente honesto
  sobre lo que los datos actuales permiten mostrar.
- **Radar** comparando **Muestra 1 vs Muestra 2** (datos reales) sobre los 3 ejes.
  Cuenta la reproducibilidad entre muestras y muestra antocianinas como n/d.
- **Callout** (`.alert` o panel) con `NOTA_LITERATURA`: la comparación numérica
  *entre hospederos* es el objetivo de la fase 2026; Torres et al. respalda
  cualitativamente que el hospedero modifica estos compuestos.
- **Tabla de datos** debajo del radar: filas = compuestos, columnas = Muestra 1 /
  Muestra 2 / Unidad / Fuente (con cita). Equivalente accesible + blindaje de rigor.

## Sección 2 — `PrediccionSection.tsx`

- `<section id="predecir" className="section--tint">` con `.section-inner`,
  kicker `data-num="04"`: "Estimación" / "Predicción fitoquímica del ejemplar".
- **Formulario** (reusa `.field`, `.pill`):
  - Hospedero: aromo / colliguay / litre / quillay / otro (de `HOSPEDEROS`).
  - Fenología: campo de texto o select corto.
- Al enviar (estado local, sin red), **bar chart** del `PERFIL_REFERENCIA`:
  polifenoles 52,8 · flavonoides 49,75 · antocianinas n/d.
- **Rótulo prominente** (`.alert`): "Valores de referencia (quintral medido 2025),
  no medición de tu ejemplar. La variación por hospedero está en estudio (fase 2026)."
- El hospedero elegido se refleja en el texto del resultado ("Perfil de referencia
  para un ejemplar en {hospedero}…") pero **no altera los números** todavía —
  honesto con la ausencia de datos por hospedero. Estructura lista para cuando
  lleguen los datos 2026.

## Integración

- `HomeClient.tsx`: montar `<CompararSection />` y `<PrediccionSection />` tras
  `MapSection` y antes/después de `ContributeForm` (orden a confirmar en
  implementación; propuesta: Identificar → Mapa → Comparar → Predecir → Aportar).
- `Nav.tsx`: agregar links `#comparar` ("Compuestos") y `#predecir` ("Predicción").
  Revisar regla responsive que oculta el 3.er link en <560px.
- `globals.css`: estilos de `.radar`, `.bar-chart`, `.data-table`, y el grid de la
  sección de predicción (formulario + gráfico), siguiendo tokens existentes.
- Numeración de kickers: Identificar 01, Mapa 02, Comparar 03, Predecir 04, Aportar
  05 (ajustar el kicker de `ContributeForm` si corresponde).

## Pruebas (Vitest, patrón existente en `src/lib/__tests__`)

- `fitoquimica.test.ts`: `promedioCompuesto` (incluye caso con `null` →
  antocianinas devuelve `null`), `maxCompuesto`, e integridad de `MUESTRAS`
  (valores reales esperados).
- Los componentes de gráfico son SVG puros derivados de props; se cubren vía los
  helpers de datos. Tests de render opcionales con Testing Library si aporta valor.

## Fuera de alcance (YAGNI)

- Persistencia o backend para predicción (es cálculo local).
- Series numéricas de literatura (no existen cifras; solo nota cualitativa).
- Modelo de estimación por hospedero (no hay datos por hospedero aún).
- Datos de poder reductor / antioxidante (no medidos).
