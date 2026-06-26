# Diseño: Banco de evaluación + métrica para detección de hospederos (Sub-proyecto A)

**Fecha:** 2026-06-26
**Estado:** Aprobado

---

## Contexto

El identificador de hospederos (`POST /api/identify`) hace una sola llamada a Claude Opus
con visión: recibe una foto, aplica un prompt botánico con razonamiento (chain-of-thought)
y devuelve las 2 opciones más probables con su confianza (ver
`docs/superpowers/specs/2026-06-25-identificador-hospederos-design.md`).

Hoy **no existe forma de medir si un cambio mejora o empeora** la calidad de las
identificaciones. Toda mejora futura (priors geográficos, múltiples fotos, segunda opinión
con Pl@ntNet) necesita una vara objetiva para validarse.

Este sub-proyecto es el **primero de cuatro** en la hoja de ruta de mejora de eficacia
(A: medición → B: priors geográficos → C: múltiples fotos → D: segunda opinión Pl@ntNet).
A va primero porque es la regla con la que se miden B, C y D.

---

## Objetivo

- Construir un **banco de evaluación**: fotos con hospedero conocido, obtenidas de iNaturalist.
- Medir la calidad del identificador con métricas claras (acierto top-1 y top-2, desglose
  por especie, pares de confusión).
- Hacerlo **reproducible**: un comando regenera los resultados; una página los muestra.
- Usar **el mismo código de identificación que la app**, para que la medición sea honesta.

### No-objetivos (YAGNI)

- No se entrena ningún modelo propio.
- No se evalúan los 31 hospederos en la primera versión (se arranca con ~10).
- No se commitean las imágenes descargadas (solo config y resultados).

---

## Sesgo conocido y declarado

Las fotos de iNaturalist suelen ser **primeros planos de hoja o corteza**, mientras que un
usuario real fotografía el **árbol completo con quintral a distancia**. Por lo tanto el
porcentaje de acierto medido será algo **optimista** respecto al uso real de la app.

Esto **no invalida** la métrica para su propósito: comparar versiones del identificador
(A vs B vs C vs D) bajo la misma vara. Se documenta explícitamente en la página de resultados
y en el informe de la feria.

---

## Arquitectura

Tres piezas con responsabilidades separadas, más un refactor habilitante.

```
iNaturalist API ──> [1] Recolector ──> eval/dataset/ (imágenes + manifest.json)
                                              │
                                              ▼
                    [2] Evaluador ──> identificarHospedero() ──> eval/results/<fecha>.json
                          (mismo código que /api/identify)              │
                                                                        ▼
                                                          [3] Página /evaluacion (tabla + gráfico)
```

### Refactor habilitante: `src/lib/identifyClient.ts`

Hoy la llamada a Anthropic vive dentro de `src/app/api/identify/route.ts`. Se extrae el
núcleo a una función reutilizable:

```typescript
// src/lib/identifyClient.ts
export async function identificarHospedero(
  imagenBase64: string,
  mediaType: AllowedMediaType,
): Promise<IdentifyResult>
```

- Contiene: creación del cliente Anthropic, `messages.create` con `PROMPT_IDENTIFY`,
  extracción del bloque de texto, `extractJson` + `parseIdentifyResult`.
- `route.ts` queda como una capa delgada: validar entrada → llamar `identificarHospedero`
  → responder. Sin cambio de comportamiento observable.
- El evaluador importa esta misma función, garantizando que mide exactamente lo que corre
  en producción.

### [1] Recolector — `scripts/eval/fetch-dataset.ts`

- Lee `scripts/eval/species.config.ts` (lista de especies a incluir + nº de fotos por especie).
- Por cada especie, consulta la API pública de iNaturalist:
  `GET https://api.inaturalist.org/v1/observations`
  con `taxon_id`, `quality_grade=research`, `photos=true`, `per_page=N`, `order_by=votes`.
  (Lectura gratuita, sin API key.)
- Descarga las fotos a `eval/dataset/<slug>/<id>.jpg` (cachea: si ya existe, no rebaja).
- Escribe `eval/dataset/manifest.json`:
  ```json
  {
    "generadoEl": "2026-06-26T...",
    "items": [
      { "archivo": "litre/12345.jpg", "hospedero": "litre", "fuente": "https://inaturalist.org/observations/12345" }
    ]
  }
  ```
- Robustez: una especie sin resultados se omite con advertencia, no aborta el proceso.

### [2] Evaluador — `scripts/eval/run-eval.ts`

- Lee `eval/dataset/manifest.json`.
- Para cada item: lee la imagen, la convierte a base64, llama `identificarHospedero`,
  compara la predicción con `item.hospedero`.
- Acumula resultados y escribe `eval/results/<YYYY-MM-DD-HHmm>.json`:
  ```json
  {
    "generadoEl": "...",
    "totalImagenes": 50,
    "aciertoTop1": 0.62,
    "aciertoTop2": 0.78,
    "porEspecie": [
      { "hospedero": "litre", "n": 5, "aciertoTop1": 0.6, "aciertoTop2": 0.8 }
    ],
    "confusiones": [
      { "verdadero": "litre", "predicho": "peumo", "veces": 3 }
    ],
    "confianzaPromedioAcierto": 0.71,
    "confianzaPromedioError": 0.48,
    "predicciones": [
      { "archivo": "litre/12345.jpg", "verdadero": "litre", "top1": "peumo", "top2": "litre", "conf1": 0.55, "conf2": 0.4 }
    ]
  }
  ```
- Maneja fallos por imagen (timeout, error de API) registrándolos sin abortar la corrida.
- Imprime en terminal un resumen legible (top-1, top-2, tabla por especie).

### [3] Página de resultados — `/evaluacion`

- Ruta nueva en la app (`src/app/evaluacion/page.tsx`).
- Lee el JSON de resultados más reciente de `eval/results/`.
- Muestra:
  - Tarjetas con acierto **top-1** y **top-2** globales.
  - Tabla por especie (n, top-1, top-2).
  - Lista de pares de confusión más frecuentes.
  - Nota visible del **sesgo conocido** (sección arriba).
- Reusa el componente `.meter` existente para las barras de porcentaje.
- Gráfico: barras de acierto por especie (puede reutilizar patrón de los charts existentes).

---

## Configuración de especies (`scripts/eval/species.config.ts`)

Set inicial: ~10 hospederos comunes con buena cobertura en iNaturalist, 5 fotos c/u (~50 imágenes).

| Slug | Nombre científico (taxón iNaturalist) |
|---|---|
| quillay | Quillaja saponaria |
| litre | Lithraea caustica |
| peumo | Cryptocarya alba |
| boldo | Peumus boldus |
| maiten | Maytenus boaria |
| aromo | Acacia dealbata |
| maqui | Aristotelia chilensis |
| huingan | Schinus polygamus |
| sauce | Salix |
| olivo | Olea europaea |

El `taxon_id` real de iNaturalist por especie se resuelve al construir la config (búsqueda
por nombre científico en la API de taxones). La estructura es editable para crecer hacia los
31 hospederos sin tocar código de los scripts.

```typescript
export const ESPECIES_EVAL: { slug: Host; taxonId: number; fotos: number }[] = [ ... ];
```

---

## Flujo de uso

```
npm run eval:fetch   # baja/actualiza el dataset desde iNaturalist
npm run eval:run     # corre el identificador y escribe results/<fecha>.json
# abrir /evaluacion en la app para ver la tabla y gráficos
```

---

## Costo

~50 imágenes = ~50 llamadas a Claude Opus visión por corrida de `eval:run`. Volumen bajo y
acotado. iNaturalist es lectura gratuita sin key. Se puede correr `eval:fetch` una vez y
`eval:run` varias veces a medida que se itera el prompt.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/lib/identifyClient.ts` | **Nuevo** — núcleo de identificación reutilizable |
| `src/app/api/identify/route.ts` | Refactor: usa `identificarHospedero`, queda delgado |
| `scripts/eval/species.config.ts` | **Nuevo** — config de especies + taxón + nº fotos |
| `scripts/eval/fetch-dataset.ts` | **Nuevo** — recolector iNaturalist + manifiesto |
| `scripts/eval/run-eval.ts` | **Nuevo** — evaluador + métricas |
| `scripts/eval/metrics.ts` | **Nuevo** — función pura de cálculo de métricas (testeable) |
| `src/app/evaluacion/page.tsx` | **Nuevo** — página de resultados |
| `package.json` | Scripts `eval:fetch` y `eval:run` |
| `.gitignore` | Ignorar `eval/dataset/` (imágenes cacheadas) |

---

## Tests

- **`metrics.ts`** (función pura): dadas predicciones + verdad, calcula bien top-1, top-2,
  desglose por especie y pares de confusión. Casos: acierto en top-1, acierto solo en top-2,
  fallo total, predicción `"otro"`.
- **`fetch-dataset`**: con respuesta de iNaturalist mockeada, arma el manifiesto correcto;
  una especie sin fotos se omite sin romper.
- **`run-eval`**: con un manifiesto e `identificarHospedero` *fake* (inyectado), produce el
  JSON de resultados esperado.
- **`identifyClient`**: con el cliente Anthropic mockeado, devuelve un `IdentifyResult`
  correctamente parseado (espejo del test actual de la ruta).

---

## Lo que NO cambia

- El prompt `PROMPT_IDENTIFY` ni `parseIdentifyResult` (solo se mueven de lugar al extraer
  `identifyClient`).
- El comportamiento observable de `POST /api/identify`.
- La UI de identificación (`IdentifySection`).
- El esquema de Supabase.
