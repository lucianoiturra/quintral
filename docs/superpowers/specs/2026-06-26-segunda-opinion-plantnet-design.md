# Diseño: Segunda opinión con Pl@ntNet (Sub-proyecto D)

**Fecha:** 2026-06-26
**Estado:** Aprobado

---

## Contexto

El identificador depende de un solo motor (Claude). Una **verificación independiente** con un
identificador botánico especializado permite *triangular*: si dos motores distintos coinciden,
la confianza sube; si difieren, conviene revisar a mano.

Sub-proyecto **D**, último de la hoja de ruta (A: medición → B: priors → C: múltiples fotos →
**D: segunda opinión Pl@ntNet**). Se valida contra el banco de A.

**Depende de A, B y C:** reutiliza `ImagenEntrada` (C), `identificarHospedero` y el banco
(`scripts/eval/*`, `metrics.ts`, `evalTypes.ts`).

**Dependencia externa:** Pl@ntNet requiere una **API key gratuita** (registro en
https://my.plantnet.org/, tier gratuito con límite diario). Se lee de `PLANTNET_API_KEY` en el
entorno (servidor). Sin la key, la verificación se desactiva con un mensaje claro, sin romper
la identificación principal.

---

## Objetivo

- Ofrecer, a demanda, una **segunda opinión** de Pl@ntNet sobre las mismas fotos.
- Mostrar las opiniones **lado a lado** con una **bandera de acuerdo** (coinciden / difieren).
- Medir el acierto de Pl@ntNet sobre el banco, para comparar Claude vs Pl@ntNet.

### No-objetivos (YAGNI)

- Pl@ntNet no se llama automáticamente (solo con botón "Verificar").
- No se fusionan ambos rankings en uno solo (se muestran por separado).
- No se persiste el resultado de Pl@ntNet en Supabase.

---

## Mapeo de nombres científicos (`src/lib/nombresCientificos.ts`, nuevo)

Pl@ntNet devuelve nombres científicos; hay que traducirlos a nuestros slugs `Host`.

```typescript
export const NOMBRES_CIENTIFICOS: Record<Host, string[]>;
// ej. quillay: ["Quillaja saponaria"], quisco: ["Echinopsis chiloensis", "Trichocereus chiloensis"]

export function hostDeNombreCientifico(nombre: string): Host | null;
```

`hostDeNombreCientifico` normaliza (minúsculas, sin autor) e intenta:
1. Coincidencia exacta de especie ("género especie").
2. Coincidencia por **género** (primera palabra), útil cuando Pl@ntNet da otra especie del
   mismo género.
Devuelve `null` si nada mapea (p. ej. si Pl@ntNet detecta el quintral, *Tristerix*, que no es
hospedero). `"otro"` no tiene nombre científico (lista vacía) y nunca se mapea desde aquí.

Este mapa es la fuente única de nombres científicos; el `species.config.ts` del banco (A) puede
derivar su nombre desde aquí para no duplicar.

---

## Cliente de Pl@ntNet (`src/lib/plantnet.ts`, nuevo — servidor)

```typescript
export interface CandidatoPlantNet {
  host: Host;
  score: number; // 0..1, agregado por host
}
export async function consultarPlantNet(
  imagenes: ImagenEntrada[],
  apiKey: string,
): Promise<{ candidatos: CandidatoPlantNet[] }>;
```

- Llama `POST https://my-api.plantnet.org/v2/identify/all?api-key=<key>` con `multipart/form-data`
  usando `FormData`/`Blob` globales (Node 18+):
  - Un campo `images` por foto (Blob desde el base64).
  - Un campo `organs` por foto, mapeando `EtiquetaFoto → órgano de Pl@ntNet`:
    `corteza→bark`, `hoja→leaf`, `arbol→habit`, `fruto→fruit`, sin etiqueta → `auto`.
- De la respuesta (`results: [{ score, species: { scientificNameWithoutAuthor } }]`):
  - Mapea cada `scientificNameWithoutAuthor` con `hostDeNombreCientifico`; descarta los `null`.
  - **Agrega por host** (suma de scores de las especies que caen en el mismo slug), ordena
    desc y normaliza el score al rango 0..1 dividiendo por la suma total mapeada.
- Devuelve a lo más los primeros candidatos (tope 3).

---

## Ruta API (`src/app/api/verify/route.ts`, nuevo)

```
POST /api/verify   body: { imagenes: ImagenEntrada[] }
```

- `runtime = "nodejs"`.
- Valida `imagenes` (no vacío, mediaType permitido, tope 4) igual que `/api/identify`.
- Si falta `PLANTNET_API_KEY` → 503 `{ error: "Verificación no disponible" }`.
- Llama `consultarPlantNet(imagenes, key)`; éxito → `{ candidatos }`; error de red → 502
  `{ error: "Pl@ntNet no respondió" }`.

---

## UI (`src/components/IdentifySection.tsx`, modificar)

- Tras el resultado de Claude, un botón **"Verificar con Pl@ntNet"** (reusa las mismas
  `ImagenEntrada[]` ya armadas para `/api/identify`).
- Estado nuevo: `verificacion: { candidatos: CandidatoPlantNet[] } | null`, `verificando`,
  `errorVerificacion`.
- Al volver, muestra un bloque **lado a lado**:
  - Columna Claude: top-2 (ya existe).
  - Columna Pl@ntNet: candidatos con su score.
  - **Bandera de acuerdo**: "Coinciden ✓" si `candidatos[0].host` está entre las 2 opciones de
    Claude; si no, "Difieren — revisa a mano". Si Pl@ntNet no devolvió candidatos mapeables,
    "Pl@ntNet no reconoció un hospedero conocido".
- Función pura `concuerdan(claude: IdentifyResult, candidatos: CandidatoPlantNet[]): "coinciden" | "difieren" | "sin-datos"` para testear la lógica fuera del componente (vive en `src/lib/acuerdo.ts`).

---

## Medición (`scripts/eval/run-plantnet.ts`, nuevo)

Script `eval:plantnet` que corre Pl@ntNet sobre el **mismo manifiesto** que A:

- Reutiliza `evaluarManifiesto` inyectando un identificador que, por item, llama
  `consultarPlantNet([imagen], key)` y construye un `IdentifyResult` sintético:
  `opciones = [candidato0, candidato1]` (o `{ hospedero: "otro", confianza: 0 }` si faltan).
- Escribe `eval/results/<fecha>-plantnet.json` (un `EvalResult`, mismas métricas que Claude).
- Requiere `PLANTNET_API_KEY`.

Compara `<fecha>-conzona.json` (Claude) vs `<fecha>-plantnet.json` (Pl@ntNet): cuál acierta más
y en qué especies se complementan.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/lib/nombresCientificos.ts` | **Nuevo** — mapa `Host`↔nombre científico |
| `src/lib/plantnet.ts` | **Nuevo** — `consultarPlantNet` (servidor) |
| `src/lib/acuerdo.ts` | **Nuevo** — `concuerdan()` (pura) |
| `src/app/api/verify/route.ts` | **Nuevo** — `POST /api/verify` |
| `src/components/IdentifySection.tsx` | Botón "Verificar"; bloque lado a lado |
| `scripts/eval/run-plantnet.ts` | **Nuevo** — `eval:plantnet` |
| `scripts/eval/species.config.ts` | Deriva nombre científico de `NOMBRES_CIENTIFICOS` |
| `package.json` | Script `eval:plantnet` |
| `.env.local` (doc) | `PLANTNET_API_KEY` documentada en el README |

---

## Tests

- **`nombresCientificos`**: coincidencia exacta de especie; coincidencia por género; nombre con
  autor se normaliza; nombre no chileno (`Tristerix corymbosus`) → `null`.
- **`plantnet`** (fetch mockeado): mapea resultados a hosts, descarta los no mapeables, agrega
  por host y ordena; respuesta vacía → sin candidatos.
- **`acuerdo`**: top de Pl@ntNet en las opciones de Claude → "coinciden"; fuera → "difieren";
  sin candidatos → "sin-datos".
- **`route /api/verify`**: sin `PLANTNET_API_KEY` → 503; con key y mock OK → `{ candidatos }`;
  arreglo vacío → 400.

---

## Lo que NO cambia

- El flujo y la salida de `/api/identify` (D solo agrega `/api/verify`).
- `IdentifyResult` ni la identificación de Claude.
- El esquema de Supabase.
