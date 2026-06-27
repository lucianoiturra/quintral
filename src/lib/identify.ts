import type { Host, IdentifyOption, IdentifyResult } from "@/lib/types";
import type { Zona } from "@/lib/zonas";
import type { EtiquetaFoto } from "@/lib/imagenes";
import { HOSPEDEROS } from "@/lib/hosts";

export const PROMPT_IDENTIFY = `Eres un botanico experto en el matorral chileno y el bosque esclerofilo.

Responde SOLO con un objeto JSON valido, sin texto antes ni despues, usando exactamente este formato:
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
  (0.2-0.4) con nombre especifico es preferible a "otro".
- "confianza" es un numero entre 0 y 1.
- "notas" resume en una oracion breve tus observaciones visuales y razonamiento.`;

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
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === '"') inString = false;
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "{") {
        if (depth === 0) start = i;
        depth += 1;
        continue;
      }

      if (char === "}" && depth > 0) {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          const candidate = text.slice(start, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            start = -1;
          }
        }
      }
    }

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

export function construirPrompt(zona?: Zona): string {
  if (!zona) return PROMPT_IDENTIFY;
  const bloque = `Contexto geográfico: la foto fue tomada en ${zona.etiqueta}. ${zona.pista}
Usa la distribución conocida de cada especie en Chile: reduce la confianza de especies que no
crecen en esa zona. No la elimines del todo si la imagen lo sugiere fuertemente, pero prioriza
las plausibles para la zona.

`;
  return bloque + PROMPT_IDENTIFY;
}

export function notaMultiFoto(imagenes: { etiqueta?: EtiquetaFoto }[]): string {
  if (imagenes.length <= 1) return "";
  return `Te muestro ${imagenes.length} fotografías del MISMO árbol hospedero (distintas vistas). Identifícalo combinando la información de todas.`;
}
