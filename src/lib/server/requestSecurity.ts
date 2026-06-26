import { ALLOWED_IMAGE_TYPES, type AllowedImageType } from "@/lib/imageMime";
import { checkRateLimit } from "@/lib/server/rateLimit";

export { ALLOWED_IMAGE_TYPES };
export type { AllowedImageType };

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getAllowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();
  allowed.add(new URL(request.url).origin);

  const envOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [];
  for (const origin of envOrigins) {
    const trimmed = origin.trim();
    if (trimmed) allowed.add(trimmed);
  }

  const appOrigin = process.env.APP_ORIGIN?.trim();
  if (appOrigin) allowed.add(appOrigin);

  return allowed;
}

export function assertTrustedOrigin(request: Request): Response | null {
  if (process.env.NODE_ENV === "test") return null;

  const origin = request.headers.get("origin")?.trim();
  const referer = request.headers.get("referer")?.trim();
  const allowedOrigins = getAllowedOrigins(request);

  if (origin && allowedOrigins.has(origin)) return null;

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.has(refererOrigin)) return null;
    } catch {
      return Response.json({ error: "Origen no permitido" }, { status: 403 });
    }
  }

  return Response.json({ error: "Origen no permitido" }, { status: 403 });
}

export async function readJsonBody<T>(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  const headerLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(headerLength) && headerLength > maxBytes) {
    return {
      ok: false,
      response: Response.json({ error: "La solicitud es demasiado grande" }, { status: 413 }),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "No se pudo leer la solicitud" }, { status: 400 }),
    };
  }

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return {
      ok: false,
      response: Response.json({ error: "La solicitud es demasiado grande" }, { status: 413 }),
    };
  }

  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "JSON invalido" }, { status: 400 }),
    };
  }
}

export function enforceRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): Response | null {
  const result = checkRateLimit(bucket, getClientIp(request), { limit, windowMs });
  if (result.ok) return null;

  return Response.json(
    { error: "Demasiadas solicitudes. Intenta nuevamente mas tarde." },
    {
      status: 429,
      headers: { "retry-after": String(result.retryAfterSeconds) },
    },
  );
}

export function normalizeBase64(base64: string): string {
  return base64.replace(/\s+/g, "");
}

export function isValidBase64(base64: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(base64) && base64.length % 4 === 0;
}

export function estimateDecodedBytes(base64: string): number {
  const normalized = normalizeBase64(base64);
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

export function base64MatchesMediaType(base64: string, mediaType: AllowedImageType): boolean {
  let bytes: Uint8Array;
  try {
    bytes = Buffer.from(normalizeBase64(base64), "base64");
  } catch {
    return false;
  }

  if (bytes.length === 0) return false;

  switch (mediaType) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "image/webp":
      return (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
  }
}

export function getExtensionForMimeType(mediaType: AllowedImageType): "jpg" | "png" | "webp" {
  switch (mediaType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}
