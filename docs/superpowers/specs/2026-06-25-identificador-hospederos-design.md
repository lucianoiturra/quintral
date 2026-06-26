# Diseño: Identificador de hospederos con 2 opciones y lista completa

**Fecha:** 2026-06-25  
**Estado:** Aprobado

---

## Contexto

La app Quintral Insight permite subir una foto para que la IA identifique el hospedero del quintral. El sistema actual tiene dos limitaciones:

1. Solo reconoce 4 hospederos (`aromo`, `colliguay`, `litre`, `quillay`), forzando a decir "otro" para cualquier otro árbol — incluso peumo o boldo, que son hospederos muy comunes.
2. Devuelve una sola opción, sin segunda alternativa.
3. El prompt no guía al modelo a razonar antes de concluir, lo que reduce la precisión.

---

## Objetivo

- Ampliar la lista de hospederos reconocibles a todos los documentados en Chile (~31 valores).
- Devolver las **2 opciones más probables**, cada una con su confianza.
- Mejorar la precisión con razonamiento botánico previo a la respuesta (chain-of-thought).
- Guiar al usuario sobre qué fotografiar para obtener mejores resultados.

---

## Tipo de datos (`src/lib/types.ts`)

### `Host` — 31 valores

```typescript
export type Host =
  | "alamo" | "aromo" | "arrayan" | "barraco" | "boldo"
  | "chacay" | "coihue" | "colliguay" | "corcolen" | "crucero"
  | "eulychnia-breviflora" | "eulychnia-castanea"
  | "huingan" | "litre" | "maqui" | "maiten" | "manzano"
  | "nothofagus-nitida" | "olivo" | "peral" | "peumo"
  | "pingo-pingo" | "platano-oriental" | "quillay"
  | "quisco" | "quisco-coquimbano" | "quisco-litoralis" | "quisco-skottsbergii"
  | "quisquito" | "sauce" | "otro";
```

### Nuevas interfaces

```typescript
export interface IdentifyOption {
  hospedero: Host;
  confianza: number; // 0..1
}

export interface IdentifyResult {
  esQuintral: boolean;
  opciones: [IdentifyOption, IdentifyOption]; // top 2, ordenadas por confianza desc
  fenologia: string;
  notas: string; // resumen del razonamiento botánico
}
```

La interfaz anterior (`hospederoProbable: Host`, `confianza: number` a nivel raíz) queda eliminada.

---

## Hospederos (`src/lib/hosts.ts`)

- `HOSPEDEROS` se expande a los 31 valores del tipo `Host`.
- Se agrega un mapa `ETIQUETAS: Record<Host, string>` con nombres legibles en español (mayúscula inicial, sin guiones, acentos correctos). Ejemplos:
  - `"platano-oriental"` → `"Plátano oriental"`
  - `"pingo-pingo"` → `"Pingo-pingo"`
  - `"eulychnia-breviflora"` → `"Eulychnia breviflora"`
- `etiquetaHospedero` usa `ETIQUETAS[h]` en lugar de la transformación de cadena actual.
- `COLORES` se extiende con un color por cada hospedero nuevo. Se usa una paleta diferenciada: verdes para nativas esclerófilas, marrones/ocres para introducidas, azulados para cactáceas, grises para "otro".

---

## Prompt (`src/lib/identify.ts`)

Nuevo `PROMPT_IDENTIFY` con dos pasos:

```
Eres un botánico experto en el matorral chileno y el bosque esclerófilo.

PASO 1 — Observación (texto libre, obligatorio):
Antes de responder el JSON, describe brevemente lo que ves en la imagen:
tipo de corteza, forma y color de las hojas del árbol hospedero, hábitat.
Si el hospedero no es visible o está muy tapado, dilo explícitamente.

PASO 2 — Responde SOLO con este JSON (sin texto adicional antes ni después):
{
  "esQuintral": boolean,
  "opciones": [
    { "hospedero": string, "confianza": number },
    { "hospedero": string, "confianza": number }
  ],
  "fenologia": string,
  "notas": string
}

Reglas:
- "hospedero" debe ser EXACTAMENTE uno de: alamo, aromo, arrayan, barraco, boldo,
  chacay, coihue, colliguay, corcolen, crucero, eulychnia-breviflora, eulychnia-castanea,
  huingan, litre, maqui, maiten, manzano, nothofagus-nitida, olivo, peral, peumo,
  pingo-pingo, platano-oriental, quillay, quisco, quisco-coquimbano, quisco-litoralis,
  quisco-skottsbergii, quisquito, sauce, otro
- Usa "otro" SOLO si el hospedero es genuinamente irreconocible. Una confianza baja
  (0.2–0.4) con nombre específico es preferible a "otro".
- "opciones" siempre contiene exactamente 2 entradas, ordenadas de mayor a menor confianza.
- "notas" resume el razonamiento del Paso 1 en una oración.
```

### `parseIdentifyResult`

Actualizar para construir `opciones: [IdentifyOption, IdentifyOption]`:
- Leer `raw.opciones[0]` y `raw.opciones[1]`.
- Si faltan o son inválidos, usar `{ hospedero: "otro", confianza: 0 }` como fallback.
- Mapear cada `hospedero` con la función `toHost` existente (valida contra `HOSPEDEROS`).
- Recortar `confianza` al rango 0..1 con la función `toConfidence` existente.

---

## UI (`src/components/IdentifySection.tsx`)

### Guía de fotografía

Texto de ayuda visible bajo el dropzone (antes de subir imagen):

> Para mejor identificación, enfoca las hojas y la corteza del árbol hospedero, no solo el quintral. Una foto cercana a las hojas es clave.

### Resultado — 2 barras de confianza

Reemplaza el bloque actual (`result-host` + `result-conf` único) por dos filas:

```
Hospederos más probables
┌──────────────────────────────────┐
│ 1º Quillay            78%        │
│ [████████░░░░]                   │
├──────────────────────────────────┤
│ 2º Litre              45%        │
│ [█████░░░░░░░]                   │
└──────────────────────────────────┘
```

Cada fila reutiliza el componente `.meter` existente con `scaleX(confianza)`.

### Umbral de alerta

El alert "Baja confianza: confirma el hospedero a mano" se activa cuando `opciones[0].confianza < 0.4` (antes era `< 0.5`).

### Prefill al mapa

`agregarAlMapa` usa `resultado.opciones[0].hospedero` como valor de hospedero.

---

## Mapa (`src/components/MapSection.tsx`)

El filtro de hospedero pasa de listar todos los `HOSPEDEROS` hardcoded a listar solo los que aparecen en las observaciones actuales (igual que ya funciona el filtro de cerros):

```typescript
const hospederosConDatos = useMemo(
  () => Array.from(new Set(observations.map((o) => o.hospedero))),
  [observations],
);
```

Esto evita mostrar 31 pills vacíos cuando la mayoría no tiene datos aún.

---

## Tests

### `src/lib/__tests__/identify.test.ts`

Reescribir todos los casos a la nueva estructura:
- Respuesta válida → `opciones[0].hospedero === "quillay"`, `opciones[1].hospedero === "litre"`.
- Hospedero desconocido en alguna opción → mapeado a `"otro"`.
- Confianza fuera de rango → recortada a 0..1.
- Campos faltantes → opciones con `{ hospedero: "otro", confianza: 0 }`.
- Entrada no-objeto → no lanza excepción.

### `src/app/api/identify/__tests__/route.test.ts`

Actualizar el mock de la IA para que devuelva JSON con `opciones`:

```json
{
  "esQuintral": true,
  "opciones": [
    { "hospedero": "quillay", "confianza": 0.9 },
    { "hospedero": "litre", "confianza": 0.5 }
  ],
  "fenologia": "en flor",
  "notas": "ok"
}
```

Cambiar aserción de `data.hospederoProbable` a `data.opciones[0].hospedero`.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/lib/types.ts` | `Host` × 31; `IdentifyOption`; `IdentifyResult` con `opciones` |
| `src/lib/hosts.ts` | `HOSPEDEROS` × 31; `ETIQUETAS`; `COLORES` completo |
| `src/lib/identify.ts` | Prompt CoT + lista completa; `parseIdentifyResult` nuevo |
| `src/components/IdentifySection.tsx` | Guía foto; 2 barras; umbral 0.4; prefill corregido |
| `src/components/MapSection.tsx` | Filtro hospedero derivado de observaciones |
| `src/lib/__tests__/identify.test.ts` | Tests actualizados |
| `src/app/api/identify/__tests__/route.test.ts` | Mock y aserciones actualizados |

---

## Lo que NO cambia

- La tabla de Supabase: `hospedero` ya es `text` sin enum, sin migración necesaria.
- El formulario `ContributeForm`: el dropdown se actualiza automáticamente al importar `HOSPEDEROS` expandido.
- La ruta API `POST /api/identify`: sin cambios estructurales, solo recibe el nuevo JSON.
