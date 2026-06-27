import { identificarHospedero } from "@/lib/identifyClient";
import type { ImagenEntrada } from "@/lib/imagenes";
import { zonaPorId } from "@/lib/zonas";
import {
  ALLOWED_IMAGE_TYPES,
  assertTrustedOrigin,
  enforceRateLimit,
  readJsonBody,
  type AllowedImageType,
} from "@/lib/server/requestSecurity";

export const runtime = "nodejs";

const MAX_IMAGENES = 4;
const MAX_JSON_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const originError = assertTrustedOrigin(request);
  if (originError) return originError;

  const rateLimitError = enforceRateLimit(request, "identify", 10, 60_000);
  if (rateLimitError) return rateLimitError;

  const parsed = await readJsonBody<{ imagenes?: ImagenEntrada[]; zona?: string }>(
    request,
    MAX_JSON_BYTES,
  );
  if (!parsed.ok) return parsed.response;

  const imagenes = Array.isArray(parsed.value.imagenes)
    ? parsed.value.imagenes.slice(0, MAX_IMAGENES)
    : [];

  if (imagenes.length === 0) {
    return Response.json({ error: "Falta la imagen" }, { status: 400 });
  }

  const tiposOk = imagenes.every((i) =>
    ALLOWED_IMAGE_TYPES.includes(i.mediaType as AllowedImageType),
  );
  if (!tiposOk) {
    return Response.json({ error: "mediaType no soportado" }, { status: 400 });
  }

  try {
    const zona = parsed.value.zona ? zonaPorId(parsed.value.zona) : undefined;
    const resultado = await identificarHospedero(imagenes, zona);
    return Response.json(resultado);
  } catch {
    return Response.json({ error: "Fallo el analisis de la imagen" }, { status: 500 });
  }
}
