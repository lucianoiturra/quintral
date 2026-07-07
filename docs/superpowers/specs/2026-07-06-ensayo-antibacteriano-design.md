# Diseño — Sección "Ensayo antibacteriano" (fase 2026)

Fecha: 2026-07-06
Estado: aprobado el enfoque; pendiente revisión del spec por el usuario.

## Contexto y objetivo

El proyecto de ciencias 2026 dio el salto de un estudio descriptivo (composición
fitoquímica del quintral según hospedero) a uno **experimental/biotecnológico**:
extractos etanólicos de quintral obtenidos desde distintos hospederos, evaluados
por su actividad antibacteriana. El informe (`Documentación/Informe Proyecto
Quintral.pdf`) contiene los resultados de esta ronda.

Queremos incorporar esos resultados a la app (https://quintral.vercel.app) con
cuatro objetivos, todos marcados por el usuario:

1. **Divulgación** al público general.
2. **Respaldo ante el jurado** del Encuentro de Ciencias (rigor, métodos, controles).
3. **Comparar hospederos** (litre vs quillay) — la hipótesis central del proyecto.
4. **Dejar el lugar preparado** para la ronda nueva con *bacterias marinas* (aún sin datos).

La app ya tiene un andamiaje de secciones de fitoquímica (Comparar = radar,
Predecir = perfil) y una ética de honestidad de datos ("n/d", "datos 2025",
"fase 2026") que esta sección debe mantener.

## El experimento (según el informe)

- **Extractos**: etanólicos (etanol 70%) de quintral obtenidos desde dos
  hospederos: **litre** y **quillay**.
- **Bacterias** (cepas de referencia ATCC):
  - *Escherichia coli* ATCC 25922 (Gram −)
  - *Staphylococcus aureus* ATCC 25923 (Gram +)
  - *Enterococcus faecalis* ATCC 29212 (Gram +)
- **Método 1 — microdilución**: OD a 600 nm del crecimiento bacteriano frente a
  concentraciones de 128, 256, 512 y 1024 µg/mL de cada extracto. Controles:
  C+ = ampicilina (5 µg/mL), C− = solo medio de cultivo. Por triplicado.
- **Método 2 — antibiograma** (difusión en disco): discos con 1024 µg de extracto
  vs control de 10 µg de ampicilina; se observa halo de inhibición. Por triplicado.

### Datos de OD digitalizados de las figuras

Valores leídos de los gráficos del informe (GraphPad, legibles). **Son medias
aproximadas leídas de figura (±~0.02); no se digitalizó la desviación estándar.**
Esto se declara en la UI.

| Bacteria | Extracto | 0 | 128 | 256 | 512 | 1024 | C+ | C− |
|---|---|---|---|---|---|---|---|---|
| *E. coli* 25922 | Litre | 0.50 | 0.62 | 0.51 | 0.53 | 0.69 | 0.06 | 0.06 |
| *E. coli* 25922 | Quillay | 0.61 | 0.55 | 0.54 | 0.52 | 0.66 | 0.06 | 0.05 |
| *S. aureus* 25923 | Litre | 0.36 | 0.34 | 0.37 | 0.46 | 0.40 | 0.07 | 0.06 |
| *S. aureus* 25923 | Quillay | 0.25 | 0.29 | 0.32 | 0.31 | 0.31 | 0.075 | 0.065 |
| *E. faecalis* 29212 | Litre | 0.14 | 0.19 | 0.16 | 0.185 | 0.25 | 0.063 | 0.059 |
| *E. faecalis* 29212 | Quillay | 0.125 | 0.173 | 0.148 | 0.174 | 0.199 | 0.063 | 0.059 |

### Lectura honesta de los resultados

En **todos** los casos el extracto (128–1024 µg/mL) mantiene la OD igual o mayor
que el control de crecimiento (0), mientras que la **ampicilina (C+) sí** baja la
OD a ~0.06. Conclusión honesta: **en microdilución el extracto no inhibió el
crecimiento de forma apreciable**; en antibiograma se observa **algún halo** para
ciertas combinaciones (p. ej. litre/quillay vs *S. aureus*), mucho menor que el de
ampicilina. Es un resultado mayormente negativo pero válido y presentable — y el
contraste con la ampicilina valida que el ensayo funcionó. La sección **no** debe
afirmar que el quintral es un antibiótico potente.

## Alcance

**Incluye:**
- Reconstrucción de las 6 curvas OD como **gráficos nativos SVG** con la UI de la
  app (no imágenes), interactivos.
- Fotos reales de antibiograma como **evidencia** (no se reconstruyen: sería
  fabricar datos), incluida la placa de ampicilina como contraste.
- Selector interactivo por bacteria; comparación litre vs quillay.
- Tarjeta reservada "Bacterias marinas — en curso".

**No incluye (YAGNI):**
- Inventar barras de error o valores de SD.
- Reconstruir las fotos de placa como SVG.
- Modificar las secciones de fitoquímica (salvo agregar la entrada al Nav).
- Carga de datos por el usuario / backend. Todo es contenido estático versionado.

## Arquitectura

### 1. Datos — `src/lib/antibacteriano.ts`

Módulo de datos puro (sin JSX), análogo a `src/lib/fitoquimica.ts`:

```ts
export type Hospedero = "litre" | "quillay";
export type BacteriaId = "e-coli" | "s-aureus" | "e-faecalis";

export interface Bacteria {
  id: BacteriaId;
  nombre: string;        // "Escherichia coli"
  cepa: string;          // "ATCC 25922"
  gram: "positiva" | "negativa";
}

// Punto de la curva OD. Concentración numérica en µg/mL; los controles
// se modelan como categorías aparte para no romper la escala.
export interface PuntoOD { concentracion: number; od: number; }
export interface CurvaOD {
  bacteria: BacteriaId;
  hospedero: Hospedero;
  puntos: PuntoOD[];     // 0,128,256,512,1024
  controlPos: number;    // C+ ampicilina
  controlNeg: number;    // C-
}

export interface FiguraAntibiograma {
  bacteria: BacteriaId;
  hospedero: Hospedero | "ampicilina"; // ampicilina = placa control
  archivo: string;       // /figuras/antibacteriano/xxx.jpg
  pie: string;
}

export const BACTERIAS: Bacteria[];
export const CONCENTRACIONES: number[];        // [128,256,512,1024]
export const CURVAS: CurvaOD[];                // 6 curvas
export const ANTIBIOGRAMAS: FiguraAntibiograma[];
export const NOTA_DATOS: string;               // "medias leídas de figura…"

// Helpers (con test):
export function curvasDeBacteria(id: BacteriaId): CurvaOD[]; // litre + quillay
export function bacteria(id: BacteriaId): Bacteria;
```

### 2. Imágenes de evidencia

Extraer del PDF las placas de antibiograma curadas (incluida la de ampicilina
con halos), optimizar y guardar en `public/figuras/antibacteriano/`. Nombres
descriptivos (`antibiograma-ecoli-ampicilina.jpg`, etc.). Solo antibiogramas —
las curvas OD NO se guardan como imagen porque se reconstruyen.

### 3. Gráfico — `src/components/OdChart.tsx`

Componente SVG nuevo (no se sobrecarga `BarChart`, que queda enfocado en su uso
actual). Reutiliza los tokens y clases CSS existentes (`bar-grid`, `bar-tick`,
`bar-cat`, colores `--quintral`, `--forest-bright`).

- **Barras agrupadas**: por cada concentración (0,128,256,512,1024) dos barras
  (litre, quillay), más un grupo de controles (C+, C−).
- **Interactividad**: hover/focus en cada barra → tooltip con hospedero,
  concentración y OD exacta. Accesible por teclado y con `aria-label`.
- Línea de referencia horizontal en el nivel de la ampicilina (C+) para que se
  vea de un vistazo que el extracto queda muy por encima.
- Sin barras de error (no hay SD digitalizada); se declara en nota.

### 4. Sección — `src/components/AntibacterianoSection.tsx`

`<section id="antibacteriano">`, mismo patrón visual que `CompararSection`:

- Encabezado: kicker `05 · Ensayo antibacteriano (2026)`, título, intro honesta
  del experimento (extractos, bacterias, métodos, controles).
- **Selector por bacteria** (3 botones/tabs, estado `useState`). Al elegir:
  - `OdChart` con litre vs quillay + controles de esa bacteria.
  - Lectura cualitativa honesta de esa bacteria (1–2 frases).
  - Galería de fotos de antibiograma de esa bacteria (litre, quillay, ampicilina).
- Mini "cómo leerlo": qué es OD600 (más alto = más crecimiento = menos inhibición),
  qué son C+/C−.
- Badge/nota `alert alert--ok`: "Resultados experimentales 2026 · estudio propio ·
  medias leídas de figura".
- Tarjeta atenuada "Bacterias marinas — ensayo en curso" (placeholder, sin datos).

### 5. Integración

- `src/components/HomeClient.tsx`: insertar `<AntibacterianoSection />` entre
  `<PrediccionSection />` y `<FaqSection />`.
- `src/components/Nav.tsx`: agregar `"antibacteriano"` a `SECTIONS` (entre
  `"predecir"` y `"preguntas"`) y un enlace "Antibacteriano" en el menú.

## Flujo de datos

Estático y unidireccional: `antibacteriano.ts` (constantes) → `AntibacterianoSection`
(estado local = bacteria elegida) → `OdChart` (props). Sin red, sin backend, sin
efectos. Igual que las secciones de fitoquímica.

## Manejo de errores

Mínimo por ser contenido estático. La única falla posible es una imagen de
antibiograma ausente: usar `alt` descriptivo y `onError` que oculte la figura sin
romper el layout. Los datos OD son constantes en TS: los cubre el compilador.

## Testing

Siguiendo el patrón vitest del repo (`src/**/__tests__`):
- `antibacteriano.test.ts`: `curvasDeBacteria` devuelve litre+quillay; `bacteria()`
  resuelve las 3 cepas; las 6 curvas tienen las 5 concentraciones esperadas y
  ambos controles.
- Test de render de `OdChart` (opcional, si el resto de componentes se testean):
  que dibuje una barra por punto y exponga los `aria-label`.
- No se testea markup presentacional de la sección.

## Integridad de datos (crítico)

- Los valores OD se declaran explícitamente como **leídos de las figuras del
  informe (aproximados, sin SD)** en la UI y en `NOTA_DATOS`.
- El tono de los textos refleja el resultado real: **inhibición limitada/nula en
  microdilución**, halo menor en antibiograma, ampicilina como control positivo
  efectivo. No se sobredimensiona.
- Antes de publicar, el usuario debe validar los valores digitalizados y los
  textos contra su informe completo (las conclusiones del informe no estaban en
  el texto extraído del PDF).

## Extensibilidad (bacterias marinas)

Sumar la ronda marina = agregar entradas a `BACTERIAS`, `CURVAS` y `ANTIBIOGRAMAS`,
y reemplazar la tarjeta placeholder. Ningún cambio estructural.
