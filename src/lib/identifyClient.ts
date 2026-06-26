import Anthropic from "@anthropic-ai/sdk";
import { parseIdentifyResult, extractJson, construirPrompt } from "@/lib/identify";
import type { AllowedImageType } from "@/lib/imageMime";
import type { IdentifyResult } from "@/lib/types";
import type { Zona } from "@/lib/zonas";

export async function identificarHospedero(
  imagenBase64: string,
  mediaType: AllowedImageType,
  zona?: Zona,
): Promise<IdentifyResult> {
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
            source: { type: "base64", media_type: mediaType, data: imagenBase64 },
          },
          { type: "text", text: construirPrompt(zona) },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseIdentifyResult(extractJson(text));
}
