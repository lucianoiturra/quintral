import type { Host, IdentifyResult } from "@/lib/types";
import { HOSPEDEROS } from "@/lib/hosts";

export const PROMPT_IDENTIFY = `Eres un asistente de botánica para un proyecto sobre el quintral chileno (Tristerix corymbosus), una planta hemiparásita.
Analiza la foto y responde SOLO con un objeto JSON, sin texto adicional, con esta forma exacta:
{
  "esQuintral": boolean,            // ¿se ve quintral en la foto?
  "hospederoProbable": string,      // uno de: aromo, colliguay, litre, quillay, otro
  "confianza": number,              // entre 0 y 1
  "fenologia": string,              // estado del ejemplar: "en flor", "con frutos", "vegetativo", etc.
  "notas": string                   // observación breve en español
}
Si no estás seguro del hospedero, usa "otro" y baja la confianza.`;

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

export function parseIdentifyResult(raw: unknown): IdentifyResult {
  const o = asObject(raw);
  return {
    esQuintral: o.esQuintral === true,
    hospederoProbable: toHost(o.hospederoProbable),
    confianza: toConfidence(o.confianza),
    fenologia: toStr(o.fenologia),
    notas: toStr(o.notas),
  };
}
