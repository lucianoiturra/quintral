import Anthropic from "@anthropic-ai/sdk";
import { parseIdentifyResult, PROMPT_IDENTIFY } from "@/lib/identify";

export const runtime = "nodejs";

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

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
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
