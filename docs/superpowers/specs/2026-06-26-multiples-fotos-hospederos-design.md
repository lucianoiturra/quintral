# Diseño: Múltiples fotos por hospedero (Sub-proyecto C)

**Fecha:** 2026-06-26
**Estado:** Aprobado

---

## Contexto

El identificador recibe hoy **una sola foto**. Un encuadre suele no mostrar lo que distingue
una especie de otra (la corteza y la hoja juntas separan especies que de lejos se confunden).

Sub-proyecto **C** de la hoja de ruta (A: medición → B: priors geográficos →
**C: múltiples fotos** → D: segunda opinión Pl@ntNet). Se valida contra el banco de A.

**Depende de A y B:** asume `src/lib/identifyClient.ts` (con `identificarHospedero(..., zona?)`),
`src/lib/identify.ts` (`construirPrompt(zona?)`), `src/lib/zonas.ts`, y el banco
(`scripts/eval/*`, `evalTypes.ts` con `ManifestItem.lat/lng`).

---

## Objetivo

- Permitir subir **hasta 4 fotos** del mismo árbol hospedero (vistas distintas) y que el
  modelo las combine en una sola identificación.
- Guiar al usuario con ranuras etiquetadas (corteza, hoja, árbol completo, fruto/flor),
  todas opcionales.
- Medir el efecto contra el banco (1 foto vs varias).

### No-objetivos (YAGNI)

- No se sube un número ilimitado de fotos (tope 4).
- Las etiquetas son una guía, no obligatorias ni validadas por contenido.
- No se cambia el formato de salida `IdentifyResult`.

---

## Tipos compartidos (`src/lib/imagenes.ts`, nuevo)

Módulo liviano (sin SDK) que pueden importar la UI (cliente), la ruta y el cliente de IA:

```typescript
export type EtiquetaFoto = "corteza" | "hoja" | "arbol" | "fruto";

export interface ImagenEntrada {
  base64: string;
  mediaType: AllowedMediaType; // reexportado o importado de identifyClient
  etiqueta?: EtiquetaFoto;
}

export const ETIQUETAS_FOTO: { id: EtiquetaFoto; titulo: string }[]; // para la UI
export const ETIQUETAS_FOTO_TEXTO: Record<EtiquetaFoto, string>;     // texto para el prompt
```

`AllowedMediaType` se mantiene como fuente única en `identifyClient.ts`; `imagenes.ts` lo
reimporta (solo el tipo, que se borra en compilación, así no arrastra el SDK al cliente).

---

## Identificador (`src/lib/identifyClient.ts`, modificar)

Firma generalizada a un arreglo de imágenes:

```typescript
export async function identificarHospedero(
  imagenes: ImagenEntrada[],
  zona?: Zona,
): Promise<IdentifyResult>;
```

- Construye el `content` del mensaje **intercalando** texto e imágenes:
  1. Si hay más de una imagen, un bloque de texto inicial con `notaMultiFoto(imagenes)`.
  2. Por cada imagen: un bloque de texto con su etiqueta (si tiene) seguido de la imagen.
  3. Un bloque de texto final con `construirPrompt(zona)` (geo + prompt base, de B).
- Una sola imagen (arreglo de uno, sin etiqueta) reproduce el comportamiento de A/B.

### Texto del prompt (`src/lib/identify.ts`, modificar)

- `construirPrompt(zona?)` no cambia (sigue siendo geo + base).
- Se agrega `notaMultiFoto(imagenes: { etiqueta?: EtiquetaFoto }[]): string` (pura):
  - `""` si hay 0 o 1 imagen.
  - Si hay ≥2: "Te muestro N fotografías del MISMO árbol hospedero (distintas vistas).
    Identifícalo combinando la información de todas."

---

## Ruta API (`src/app/api/identify/route.ts`, modificar)

- El body pasa de `{ imageBase64, mediaType, zona? }` a `{ imagenes: ImagenEntrada[], zona? }`.
- Validaciones:
  - `imagenes` debe ser un arreglo no vacío (400 "Falta la imagen" si falta o vacío).
  - Cada `mediaType` debe estar en `ALLOWED_MEDIA_TYPES` (400 si alguno no lo está).
  - Tope de 4 imágenes (las extra se ignoran, no es error).
- `zona` se resuelve como en B (`zonaPorId`, inválida se ignora).
- Llama `identificarHospedero(imagenes, zona)`.

---

## UI

### `src/components/RanurasFotos.tsx` (nuevo)

Componente que extrae el manejo de fotos de `IdentifySection` (que ya está grande):

- Renderiza una ranura por cada `ETIQUETAS_FOTO` (4): título, dropzone, vista previa y botón
  para quitar. Cada ranura acepta una imagen (JPG/PNG/WEBP, máx 4 MB), validada igual que hoy.
- Estado de archivos elevado vía props: recibe `archivos: Record<EtiquetaFoto, File | null>` y
  `onCambio(etiqueta, file)`.
- Mantiene los `objectURL` de previa y los revoca al cambiar.

### `src/components/IdentifySection.tsx` (modificar)

- Reemplaza el dropzone único por `<RanurasFotos>`.
- Estado `archivos: Record<EtiquetaFoto, File | null>`.
- `analizar`: arma `ImagenEntrada[]` con las ranuras no vacías (base64 + mediaType + etiqueta),
  sube cada foto con `uploadFoto` (la primera no vacía se usa como `fotoUrl` para el mapa),
  y hace POST `{ imagenes, ...(zona) }`.
- El botón Analizar se habilita si hay **al menos una** foto.
- El resto del resultado (barras, fenología, alerta) no cambia.

---

## Medición (extensión del banco)

### iNaturalist: varias fotos por observación

`scripts/eval/inaturalist.ts` agrega `gruposDeFotos(observaciones, maxObs, fotosPorObs)` que
devuelve, por observación con foto, **hasta `fotosPorObs` fotos** (todas de la misma planta):

```typescript
export function gruposDeFotos(
  observaciones: INatObservation[],
  maxObs: number,
  fotosPorObs: number,
): { id: number; urls: string[]; fuente: string; lat?: number; lng?: number }[];
```

`urlsDeFotos` (1 foto/obs, de A) se conserva para el flujo normal.

### Manifiesto múltiple

`src/lib/evalTypes.ts` agrega:

```typescript
export interface ManifestMultiItem {
  archivos: string[]; // varias fotos de la MISMA observación
  hospedero: Host;
  fuente: string;
  lat?: number;
  lng?: number;
}
export interface ManifestMulti {
  generadoEl: string;
  items: ManifestMultiItem[];
}
```

`scripts/eval/fetch-dataset.ts` además de `manifest.json` escribe `manifestMulti.json`,
bajando hasta `fotosPorObs` (K = 3) imágenes por observación a `eval/dataset/<slug>/<id>-<n>.jpg`.
Solo incluye observaciones con ≥2 fotos (para que el modo multi tenga sentido).

### `run-eval --multi`

`scripts/eval/run-eval.ts` agrega el flag `--multi`:
- Lee `manifestMulti.json`.
- Por item, arma `ImagenEntrada[]` leyendo cada archivo (base64 + mediaType, sin etiqueta) y
  llama `identificarHospedero(imagenes, zona)` (la zona se deriva de la latitud como en B,
  salvo `--sin-zona`).
- Salida: `eval/results/<fecha>-multi.json` (combinable con `--sin-zona` →
  `<fecha>-multi-sinzona.json`).

Comparas `<fecha>-conzona.json` (1 foto) vs `<fecha>-multi.json` (varias) para ver si subir
fotos mejora el acierto.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/lib/imagenes.ts` | **Nuevo** — `EtiquetaFoto`, `ImagenEntrada`, etiquetas |
| `src/lib/identify.ts` | `notaMultiFoto()` |
| `src/lib/identifyClient.ts` | `identificarHospedero(imagenes[], zona?)` + content intercalado |
| `src/app/api/identify/route.ts` | Body `{ imagenes[] }`; valida y topea a 4 |
| `src/components/RanurasFotos.tsx` | **Nuevo** — 4 ranuras guiadas |
| `src/components/IdentifySection.tsx` | Usa `RanurasFotos`; arma `ImagenEntrada[]` |
| `src/lib/evalTypes.ts` | `ManifestMultiItem`, `ManifestMulti` |
| `scripts/eval/inaturalist.ts` | `gruposDeFotos()` |
| `scripts/eval/fetch-dataset.ts` | Escribe `manifestMulti.json` (K=3, ≥2 fotos) |
| `scripts/eval/run-eval.ts` | Flag `--multi` |

---

## Tests

- **`notaMultiFoto`**: "" con 0/1 imagen; con ≥2 contiene "MISMO árbol" y el número N.
- **`identifyClient`** (mock SDK): con 2 imágenes el `content` enviado contiene ambas imágenes,
  la nota multi-foto y los textos de etiqueta; con 1 imagen no incluye la nota.
- **`route`**: arreglo vacío → 400; mediaType inválido en una imagen → 400; 5 imágenes → usa 4;
  arreglo válido → 200 y pasa las imágenes al cliente.
- **`inaturalist` `gruposDeFotos`**: respeta `maxObs` y `fotosPorObs`; omite observaciones sin
  fotos; propaga lat/lng.
- **`RanurasFotos`** (Testing Library): rechaza archivos > 4 MB y tipos no permitidos; emite
  `onCambio` con el archivo válido.

---

## Lo que NO cambia

- El formato `IdentifyResult` ni `parseIdentifyResult`.
- `construirPrompt(zona?)` (de B) ni `PROMPT_IDENTIFY`.
- El flujo de una sola foto sigue funcionando (arreglo de uno).
- El esquema de Supabase.
