import Anthropic from "@anthropic-ai/sdk";
import { parseIdentifyResult, extractJson, construirPrompt, notaMultiFoto } from "@/lib/identify";
import { ETIQUETAS_FOTO_TEXTO, type ImagenEntrada } from "@/lib/imagenes";
import type { IdentifyResult } from "@/lib/types";
import type { Zona } from "@/lib/zonas";

export async function identificarHospedero(
  imagenes: ImagenEntrada[],
  zona?: Zona,
): Promise<IdentifyResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content: Anthropic.ContentBlockParam[] = [];
  const nota = notaMultiFoto(imagenes);
  if (nota) content.push({ type: "text", text: nota });

  for (const img of imagenes) {
    if (img.etiqueta) {
      content.push({ type: "text", text: ETIQUETAS_FOTO_TEXTO[img.etiqueta] + ":" });
    }
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    });
  }
  content.push({ type: "text", text: construirPrompt(zona) });

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseIdentifyResult(extractJson(text));
}
