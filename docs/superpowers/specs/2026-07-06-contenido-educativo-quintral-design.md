# Diseño: Contenido educativo del quintral (FAQ, biblioteca fitoquímica y evidencia antimicrobiana)

Fecha: 2026-07-06
Fuente: `Documentación/Sugerencias de cambios.docx`

## Objetivo

Incorporar a la app Quintral Insight tres bloques de contenido educativo/científico
ya redactados en el documento de sugerencias:

1. **Asistente científico (FAQ curada)** — 15 preguntas y respuestas sobre el quintral.
2. **Biblioteca fitoquímica** — fichas de 6 grupos de compuestos con evidencia.
3. **Evidencia antimicrobiana 2026** — resultados del proyecto propio.

## Decisiones tomadas

- **FAQ curada, no chat con IA.** La app es una PWA pensada para usarse sin señal en
  terreno. Una FAQ estática funciona offline, tiene costo cero y usa exactamente las
  respuestas verificadas del documento. No se usa la API de Anthropic para esto.
- **Ubicación:**
  - La FAQ es una **sección nueva** `#preguntas` en el menú, entre Predicción y
    Ciencia ciudadana.
  - La biblioteca fitoquímica y la evidencia antimicrobiana **amplían la sección
    existente `#comparar` (Compuestos)**, debajo del gráfico actual, por ser del mismo tema.
- **Sin backend ni API nueva.** Todo es contenido estático que encaja con la PWA offline.
- Lo cuantitativo (gráfico actual, `fitoquimica.ts`) se mantiene **separado** de lo
  cualitativo (biblioteca): uno son valores medidos, el otro es "presente sí/no + evidencia".

## Modelo de datos (nuevos archivos en `src/lib/`)

### `faq.ts`
```ts
export interface PreguntaFaq {
  pregunta: string;
  respuesta: string; // texto plano/párrafos del documento
}
export const FAQ: PreguntaFaq[]; // 15 entradas exactas del documento
```

Las 15 preguntas: qué es el quintral; por qué es hemiparásita; cómo obtiene agua y
nutrientes; qué aves dispersan sus semillas; qué árboles hospeda; dónde vive; si mata a los
árboles; si es invasora; propiedades medicinales; compuestos fitoquímicos; importancia
ecológica; cómo reconocerlo en terreno; diferencia con el muérdago europeo; qué animales
dependen de él; cómo participar en la conservación.

### `bibliotecaFito.ts`
```ts
export interface EstudioFito {
  cita: string;        // "Torres et al. (2019)"
  descripcion: string; // qué aporta el estudio
  url: string;
}
export interface FichaCompuesto {
  id: string;
  nombre: string;                 // "Polifenoles"
  queEs: string;
  funcionEnPlanta: string[];      // lista
  aplicacionesBiomedicas: string[]; // lista
  presenteEnQuintral: true;
  estudios: EstudioFito[];
}
export const BIBLIOTECA: FichaCompuesto[]; // 6: polifenoles, flavonoides, terpenoides, quinonas, esteroles, glicósidos
```

Estudios citados en el documento: Torres et al. (2019) — scielo.cl; Simirgiotis et al.
(2016) — researchers.unab.cl (solo polifenoles y flavonoides). Las URLs se limpian del
sufijo `utm_source=chatgpt.com`.

### `antimicrobiano.ts`
```ts
export interface ResultadoBacteria {
  bacteria: string;    // "Escherichia coli ATCC 25922"
  inhibicion: false;   // sin inhibición en todas
}
export const RESULTADOS: ResultadoBacteria[]; // 3 bacterias
export const CONCENTRACIONES: number[];        // 128, 256, 512, 1024 (µg/mL)
export const CONTROL_POSITIVO: string;          // "ampicilina"
export const FACTORES: string[];                // factores que influyen
export const LINEAS_FUTURAS: string[];          // investigaciones que continúan
export const APRENDIZAJE: string;               // "qué aprendimos"
```

## Componentes nuevos (`src/components/`)

### `FaqSection.tsx`
- Sección `#preguntas`. Encabezado con `kicker` numerado.
- Lista de acordeones con `<details>/<summary>` nativo (accesible, funciona sin JS y offline).
- Reutiliza la clase `card`.

### `BibliotecaFito.tsx`
- Grid de fichas (reutiliza `card` / `chart-grid`).
- Cada ficha muestra: nombre, "¿Qué es?", "¿Qué función tiene en la planta?" (lista),
  "¿Qué aplicaciones biomédicas se estudian?" (lista).
- Botón "¿Está presente en el quintral?" → revela "✅ Sí" y un botón/detalle
  "Ver estudios científicos" que despliega las citas con enlaces externos
  (`target="_blank" rel="noopener noreferrer"`).
- Implementado con `<details>` o estado local mínimo; preferencia por `<details>` para
  robustez offline.

### `EvidenciaAntimicrobiana.tsx`
- Tabla de resultados (3 bacterias → "Sin inhibición"), usando la clase `data-table`.
- Texto de concentraciones y controles.
- Bloques: "Factores que pueden influir", "Investigaciones que continúan", "Qué aprendimos".

`BibliotecaFito` y `EvidenciaAntimicrobiana` se insertan **dentro de
`CompararSection.tsx`**, debajo del gráfico existente.

## Cambios en archivos existentes

- **`Nav.tsx`**: agregar `"preguntas"` al arreglo `SECTIONS` y un enlace "Preguntas" en el
  menú, entre "Predicción" y "Ciencia ciudadana".
- **`HomeClient.tsx`**: renderizar `<FaqSection />` en el orden correcto (tras Predicción,
  antes de ContributeForm).
- **`CompararSection.tsx`**: insertar los dos componentes nuevos y actualizar el copy de
  introducción, que hoy dice que la comparación entre hospederos "es el objetivo de la fase
  2026"; ahora existe evidencia 2026 (antimicrobiana), así que el texto debe enlazar con ella.
- **`globals.css`**: agregar estilos solo si hacen falta para acordeones/fichas; preferir
  reutilizar clases existentes (`card`, `data-table`, `section`, `kicker`).

## Pruebas (Vitest)

- **Integridad de datos:**
  - Las 15 FAQ tienen `pregunta` y `respuesta` no vacías.
  - Cada compuesto de la biblioteca tiene `queEs`, `funcionEnPlanta` (≥1), 
    `aplicacionesBiomedicas` (≥1) y `estudios` (≥1) con `url` válida.
  - La tabla antimicrobiana tiene las 3 bacterias esperadas.
- **Render smoke test** de `FaqSection`, `BibliotecaFito` y `EvidenciaAntimicrobiana`
  (que renderizan sin error y muestran el contenido base).

## Fuera de alcance

- Chat con IA / API nueva.
- Datos cuantitativos por hospedero (sigue siendo objetivo futuro; solo se documenta la
  evidencia cualitativa y la antimicrobiana ya obtenida).
- Traducciones o multi-idioma.
