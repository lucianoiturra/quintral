import Anthropic from "@anthropic-ai/sdk";
import { parseIdentifyResult, extractJson, PROMPT_IDENTIFY } from "@/lib/identify";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: { imageBase64?: string; mediaType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { imageBase64, mediaType } = body;
  if (!imageBase64 || !mediaType) {
    return Response.json({ error: "Falta la imagen" }, { status: 400 });
  }

  const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as AllowedMediaType)) {
    return Response.json({ error: "mediaType no soportado" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
                media_type: mediaType as AllowedMediaType,
                data: imageBase64,
              },
            },
            { type: "text", text: PROMPT_IDENTIFY },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return Response.json(parseIdentifyResult(extractJson(text)));
  } catch {
    return Response.json({ error: "Falló el análisis de la imagen" }, { status: 500 });
  }
}
