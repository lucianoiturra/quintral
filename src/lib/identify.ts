import type { Host, IdentifyOption, IdentifyResult } from "@/lib/types";
import { HOSPEDEROS } from "@/lib/hosts";

export const PROMPT_IDENTIFY = `Eres un botánico experto en el matorral chileno y el bosque esclerófilo.

PASO 1 — Observación (texto libre, obligatorio antes del JSON):
Describe brevemente lo que observas en la imagen: tipo de corteza del árbol hospedero,
forma y color de sus hojas, hábitat visible. Si el hospedero no es visible o está muy
tapado por el quintral, dilo explícitamente.

PASO 2 — Responde SOLO con este JSON (sin texto adicional después):
{
  "esQuintral": boolean,
  "opciones": [
    { "hospedero": string, "confianza": number },
    { "hospedero": string, "confianza": number }
  ],
  "fenologia": string,
  "notas": string
}

Reglas estrictas:
- "hospedero" debe ser EXACTAMENTE uno de estos valores (sin variantes):
  alamo, aromo, arrayan, barraco, boldo, chacay, coihue, colliguay, corcolen, crucero,
  eulychnia-breviflora, eulychnia-castanea, huingan, litre, maqui, maiten, manzano,
  nothofagus-nitida, olivo, peral, peumo, pingo-pingo, platano-oriental, quillay,
  quisco, quisco-coquimbano, quisco-litoralis, quisco-skottsbergii, quisquito, sauce, otro
- "opciones" siempre tiene exactamente 2 entradas, ordenadas de mayor a menor confianza.
- Usa "otro" SOLO si el hospedero es genuinamente irreconocible. Una confianza baja
  (0.2–0.4) con nombre específico es preferible a "otro".
- "confianza" es un número entre 0 y 1.
- "notas" resume en una oración tu razonamiento del Paso 1.`;

function asObject(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function toHost(value: unknown): Host {
  return HOSPEDEROS.includes(value as Host) ? (value as Host) : "otro";
}

function toConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function toStr(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return {};
  }
}

const FALLBACK_OPTION: IdentifyOption = { hospedero: "otro", confianza: 0 };

function toIdentifyOption(raw: unknown): IdentifyOption {
  const o = asObject(raw);
  return {
    hospedero: toHost(o.hospedero),
    confianza: toConfidence(o.confianza),
  };
}

export function parseIdentifyResult(raw: unknown): IdentifyResult {
  const o = asObject(raw);
  const rawOpciones = Array.isArray(o.opciones) ? o.opciones : [];
  return {
    esQuintral: o.esQuintral === true,
    opciones: [
      rawOpciones[0] !== undefined ? toIdentifyOption(rawOpciones[0]) : FALLBACK_OPTION,
      rawOpciones[1] !== undefined ? toIdentifyOption(rawOpciones[1]) : FALLBACK_OPTION,
    ],
    fenologia: toStr(o.fenologia),
    notas: toStr(o.notas),
  };
}
