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
    const result = await identificarHospedero("AAAA", "image/jpeg");
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
    await identificarHospedero("AAAA", "image/jpeg", norte);
    const arg = createMock.mock.calls[0][0];
    const textBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "text");
    expect(textBlock.text).toContain(norte.pista);
  });

  it("sin zona no incluye contexto geográfico", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    await identificarHospedero("AAAA", "image/jpeg");
    const arg = createMock.mock.calls[0][0];
    const textBlock = arg.messages[0].content.find((b: { type: string }) => b.type === "text");
    expect(textBlock.text).not.toContain("Contexto geográfico");
  });
});
