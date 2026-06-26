import Anthropic from "@anthropic-ai/sdk";
import { extractJson, parseIdentifyResult, PROMPT_IDENTIFY } from "@/lib/identify";
import { zonaPorId } from "@/lib/zonas";
import {
  ALLOWED_IMAGE_TYPES,
  assertTrustedOrigin,
  base64MatchesMediaType,
  enforceRateLimit,
  estimateDecodedBytes,
  isValidBase64,
  normalizeBase64,
  readJsonBody,
  type AllowedImageType,
} from "@/lib/server/requestSecurity";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_JSON_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const originError = assertTrustedOrigin(request);
  if (originError) return originError;

  const rateLimitError = enforceRateLimit(request, "identify", 10, 60_000);
  if (rateLimitError) return rateLimitError;

  const parsed = await readJsonBody<{ imageBase64?: string; mediaType?: string; zona?: string }>(
    request,
    MAX_JSON_BYTES,
  );
  if (!parsed.ok) return parsed.response;

  const { imageBase64, mediaType, zona: zonaId } = parsed.value;
  if (!imageBase64 || !mediaType) {
    return Response.json({ error: "Falta la imagen" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.includes(mediaType as AllowedImageType)) {
    return Response.json({ error: "mediaType no soportado" }, { status: 400 });
  }

  const normalizedBase64 = normalizeBase64(imageBase64);
  if (!isValidBase64(normalizedBase64)) {
    return Response.json({ error: "La imagen no esta en base64 valido" }, { status: 400 });
  }

  if (estimateDecodedBytes(normalizedBase64) > MAX_IMAGE_BYTES) {
    return Response.json({ error: "La imagen es demasiado grande. Maximo 4 MB." }, { status: 413 });
  }

  if (!base64MatchesMediaType(normalizedBase64, mediaType as AllowedImageType)) {
    return Response.json({ error: "El contenido de la imagen no coincide con mediaType" }, { status: 400 });
  }

  try {
    const zona = zonaId ? zonaPorId(zonaId) : undefined;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Construir prompt con contexto geográfico si hay zona
    let prompt = PROMPT_IDENTIFY;
    if (zona) {
      prompt = `${PROMPT_IDENTIFY}\n\nContexto geográfico: ${zona.etiqueta}. ${zona.pista}`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as AllowedImageType,
                data: normalizedBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return Response.json(parseIdentifyResult(extractJson(text)));
  } catch {
    return Response.json({ error: "Fallo el analisis de la imagen" }, { status: 500 });
  }
}
