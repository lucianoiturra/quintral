import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

import { identificarHospedero } from "@/lib/identifyClient";
import { ZONAS } from "@/lib/zonas";

describe("identificarHospedero", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("devuelve un resultado válido", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"esQuintral": true, "opciones": [{"hospedero": "quillay", "confianza": 0.9}, {"hospedero": "litre", "confianza": 0.7}], "fenologia": "floración", "notas": "flores blancas"}',
        },
      ],
    });
    const result = await identificarHospedero([{ base64: "AAAA", mediaType: "image/jpeg" }]);
    expect(result.esQuintral).toBe(true);
    expect(result.opciones[0].hospedero).toBe("quillay");
  });
});

describe("identificarHospedero con zona", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("incluye la pista de la zona en el texto enviado a la IA", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    const norte = ZONAS.find((z) => z.id === "norte")!;
    await identificarHospedero([{ base64: "AAAA", mediaType: "image/jpeg" }], norte);
    const arg = createMock.mock.calls[0][0];
    const textBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "text");
    expect(textBlock.text).toContain(norte.pista);
  });

  it("sin zona no incluye contexto geográfico", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    await identificarHospedero([{ base64: "AAAA", mediaType: "image/jpeg" }]);
    const arg = createMock.mock.calls[0][0];
    const textBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "text");
    expect(textBlock.text).not.toContain("Contexto geográfico");
  });
});

describe("identificarHospedero multi-foto", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("con varias imágenes envía todas y la nota multi-foto", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    await identificarHospedero([
      { base64: "AAAA", mediaType: "image/jpeg", etiqueta: "corteza" },
      { base64: "BBBB", mediaType: "image/jpeg", etiqueta: "hoja" },
    ]);
    const arg = createMock.mock.calls[0][0];
    const content = arg.messages[0].content as { type: string; text?: string; source?: { data: string } }[];
    const imagenes = content.filter((b) => b.type === "image");
    expect(imagenes.map((b) => b.source!.data)).toEqual(["AAAA", "BBBB"]);
    const textos = content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    expect(textos).toContain("MISMO árbol");
    expect(textos).toContain("corteza");
  });

  it("con una sola imagen no incluye la nota multi-foto", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    await identificarHospedero([{ base64: "AAAA", mediaType: "image/jpeg" }]);
    const arg = createMock.mock.calls[0][0];
    const textos = (arg.messages[0].content as { type: string; text?: string }[])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    expect(textos).not.toContain("MISMO árbol");
  });
});
