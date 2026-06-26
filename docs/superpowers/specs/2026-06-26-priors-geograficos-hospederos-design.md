# Diseño: Pista geográfica para el identificador de hospederos (Sub-proyecto B)

**Fecha:** 2026-06-26
**Estado:** Aprobado

---

## Contexto

El identificador de hospederos (`identificarHospedero` → `POST /api/identify`) recibe hoy
solo una imagen. No conoce la ubicación, así que puede sugerir especies imposibles en esa
zona (p. ej. una cactácea del norte para una foto del sur).

Este es el **sub-proyecto B** de la hoja de ruta de mejora de eficacia
(A: medición → **B: priors geográficos** → C: múltiples fotos → D: segunda opinión Pl@ntNet).
Se valida contra el banco de evaluación construido en A.

**Depende de A:** B asume que el sub-proyecto A ya está implementado: `src/lib/identifyClient.ts`,
`src/lib/evalTypes.ts`, el banco (`scripts/eval/*`) y el manifiesto. B extiende esas piezas.

---

## Objetivo

- Permitir que el identificador reciba (opcionalmente) la **zona** donde se tomó la foto.
- Pasar esa zona al prompt como contexto para que el modelo **baje la confianza** de especies
  que no crecen ahí (prior suave; no un filtro duro).
- Capturar la zona en la UI con un selector simple.
- Medir el efecto contra el banco de evaluación (con y sin pista geográfica).

### No-objetivos (YAGNI)

- No se usa GPS del navegador ni EXIF (decisión: selector manual de zona).
- No se consulta la distribución de iNaturalist en vivo (el modelo razona desde el texto).
- No se filtran/eliminan especies de forma dura; solo se ajusta la confianza vía prompt.
- No se cambian las regiones a granularidad fina (3 macrozonas bastan para v1).

---

## Zonas

Tres macrozonas biogeográficas relevantes para la distribución de los hospederos, más una
opción nula. Cada zona tiene un `id` (estable), una `etiqueta` (UI) y una `pista` (texto que
va al prompt).

| id | etiqueta | pista (resumen para el prompt) |
|---|---|---|
| `norte` | Norte Chico (Atacama–Coquimbo) | Desierto costero y matorral; dominan cactáceas columnares (quisco, quisco-coquimbano, eulychnia, pingo-pingo, quisquito). |
| `centro` | Chile central (Valparaíso–Maule) | Matorral y bosque esclerófilo; dominan quillay, litre, peumo, boldo, maitén, huingán, colliguay, crucero, corcolén. |
| `sur` | Centro-sur y sur (Ñuble–Los Lagos) | Bosque templado lluvioso y caducifolio; dominan coihue, nothofagus-nitida, arrayán, maqui, chacay, barraco. |

La opción "No sé / no especificar" se representa con **ausencia de zona** (`undefined`): no se
agrega contexto geográfico, equivalente al comportamiento previo a B.

### Asignación automática por latitud (para el banco de evaluación)

`zonaPorLatitud(lat)` mapea la latitud (negativa en Chile) a una `Zona`:

- `lat > -31.5` → `norte`
- `-31.5 >= lat > -36` → `centro`
- `lat <= -36` → `sur`

Latitudes fuera del rango chileno continental igual caen en una de las tres bandas (no se
descarta ninguna foto por latitud). Si una foto no tiene coordenadas, no se asigna zona.

---

## Componentes

### `src/lib/zonas.ts` (nuevo)

```typescript
export type ZonaId = "norte" | "centro" | "sur";

export interface Zona {
  id: ZonaId;
  etiqueta: string;
  pista: string;
}

export const ZONAS: Zona[];                 // las 3 macrozonas
export function zonaPorId(id: string): Zona | undefined;
export function zonaPorLatitud(lat: number): Zona; // siempre devuelve una de las 3
```

Responsabilidad única: definir las zonas y los dos mapeos (por id y por latitud). Sin IO.

### `src/lib/identify.ts` (modificar)

- `PROMPT_IDENTIFY` se mantiene como **base** (sin cambios de contenido).
- Se agrega `construirPrompt(zona?: Zona): string` que devuelve `PROMPT_IDENTIFY` con un
  **bloque geográfico** antepuesto cuando hay zona:

  ```
  Contexto geográfico: la foto fue tomada en <etiqueta>. <pista>
  Usa la distribución conocida de cada especie en Chile: reduce la confianza de
  especies que no crecen en esa zona. No la elimines del todo si la imagen lo sugiere
  fuertemente, pero prioriza las plausibles para la zona.

  <PROMPT_IDENTIFY>
  ```

  Sin zona, `construirPrompt()` devuelve exactamente `PROMPT_IDENTIFY` (retrocompatible).
- `parseIdentifyResult`, `extractJson`, `toHost`, etc. **no cambian**.

### `src/lib/identifyClient.ts` (modificar)

- La firma pasa a `identificarHospedero(imagenBase64, mediaType, zona?: Zona): Promise<IdentifyResult>`.
- Usa `construirPrompt(zona)` en lugar de la constante `PROMPT_IDENTIFY`.
- El parámetro `zona` es opcional → las llamadas existentes (sin zona) siguen compilando y
  comportándose igual.

### `src/app/api/identify/route.ts` (modificar)

- El body acepta `zona?: string` (id de zona).
- Si viene `zona`, se valida con `zonaPorId`; si es inválida, se ignora (se trata como sin zona)
  en vez de devolver error — un id desconocido no debe romper la identificación.
- Se pasa la `Zona` resuelta (o `undefined`) a `identificarHospedero`.

### `src/components/IdentifySection.tsx` (modificar)

- Estado nuevo `zonaId: ZonaId | ""` (vacío = no especificar).
- Un `<select>` sobre el botón Analizar:
  - Opción por defecto: "¿Dónde se tomó la foto? (opcional)".
  - Una `<option>` por cada `ZONAS` con su `etiqueta`.
- En `analizar`, si `zonaId` no está vacío, se incluye `zona: zonaId` en el body del POST.
- Texto de ayuda corto: indicar que la zona mejora la precisión.

---

## Banco de evaluación (extensión de A)

### Manifiesto con coordenadas

`ManifestItem` (en `src/lib/evalTypes.ts`) gana dos campos opcionales:

```typescript
export interface ManifestItem {
  archivo: string;
  hospedero: Host;
  fuente: string;
  lat?: number; // de la observación de iNaturalist
  lng?: number;
}
```

### iNaturalist devuelve coordenadas

`INatObservation` (en `scripts/eval/inaturalist.ts`) gana `location?: string`
(formato `"lat,lng"` que entrega la API). `urlsDeFotos` propaga `lat`/`lng` parseados a cada
entrada. `fetch-dataset` los guarda en el manifiesto.

### `run-eval` pasa la zona

- Para cada item con `lat`/`lng`, deriva `zona = zonaPorLatitud(lat)` y la pasa a
  `identificarHospedero`. Sin coordenadas → sin zona.
- Bandera `--sin-zona`: ignora la zona aunque haya coordenadas, para producir el **baseline**.
- El nombre del archivo de resultados refleja el modo: `<fecha>-conzona.json` o
  `<fecha>-sinzona.json`, para comparar ambos sin pisarse.

### Comparación

Correr `npm run eval:run -- --sin-zona` y `npm run eval:run` produce dos `EvalResult`. La
mejora de B es la diferencia de `aciertoTop1` / `aciertoTop2` entre ambos. (Visualizarlo en la
página `/evaluacion` queda fuera de alcance de B; basta comparar los dos JSON.)

---

## Flujo de datos

```
UI: <select> zona ──► POST /api/identify { imageBase64, mediaType, zona }
                          │
                          ▼  zonaPorId(zona)
                  identificarHospedero(img, mediaType, Zona)
                          │  construirPrompt(zona)  ← bloque geográfico
                          ▼
                        Claude ──► IdentifyResult

Banco: manifest(lat,lng) ──► zonaPorLatitud(lat) ──► identificarHospedero(img, mt, Zona)
```

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/lib/zonas.ts` | **Nuevo** — `Zona`, `ZONAS`, `zonaPorId`, `zonaPorLatitud` |
| `src/lib/identify.ts` | `construirPrompt(zona?)` + bloque geográfico |
| `src/lib/identifyClient.ts` | `identificarHospedero` acepta `zona?` |
| `src/app/api/identify/route.ts` | Lee/valida `zona` del body, la pasa al cliente |
| `src/components/IdentifySection.tsx` | `<select>` de zona; lo manda en el POST |
| `src/lib/evalTypes.ts` | `ManifestItem.lat?`, `.lng?` |
| `scripts/eval/inaturalist.ts` | `location` de iNat → `lat`/`lng` en `urlsDeFotos` |
| `scripts/eval/fetch-dataset.ts` | Guarda `lat`/`lng` en el manifiesto |
| `scripts/eval/run-eval.ts` | Deriva zona por latitud; flag `--sin-zona`; nombre de salida |

---

## Tests

- **`zonas`**: `zonaPorLatitud` mapea correctamente las tres bandas (casos en los bordes
  −31.5 y −36); `zonaPorId` devuelve la zona correcta y `undefined` para id inexistente.
- **`identify` / `construirPrompt`**: sin zona devuelve `PROMPT_IDENTIFY` tal cual; con zona
  antepone el bloque geográfico que incluye la `etiqueta` y la `pista`.
- **`identifyClient`**: con zona, el texto enviado a la IA contiene la pista de la zona; sin
  zona, no. (Mock del SDK como en A.)
- **`route`**: `zona` válida se pasa resuelta; `zona` inválida se ignora sin romper (200);
  sin `zona` se comporta como antes.
- **`inaturalist`**: `urlsDeFotos` parsea `location` "lat,lng" a números; observación sin
  `location` produce entrada sin `lat`/`lng`.

---

## Lo que NO cambia

- El contenido de `PROMPT_IDENTIFY` (solo se le antepone un bloque opcional).
- `parseIdentifyResult` ni la forma de `IdentifyResult`.
- La página `/evaluacion` (sigue mostrando el último resultado; la comparación con/sin zona
  se hace mirando los dos JSON).
- El esquema de Supabase ni el formulario de aporte.
