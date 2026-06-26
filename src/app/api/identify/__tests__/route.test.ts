import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

import { POST } from "@/app/api/identify/route";
import { resetRateLimits } from "@/lib/server/rateLimit";

function req(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/identify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "x-forwarded-for": "203.0.113.9",
      ...headers,
    },
  });
}

describe("POST /api/identify", () => {
  beforeEach(() => {
    createMock.mockReset();
    resetRateLimits();
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.NODE_ENV = "test";
  });

  it("devuelve un IdentifyResult normalizado", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: 'Aqui esta: {"esQuintral": true, "opciones": [{"hospedero": "quillay", "confianza": 0.9}, {"hospedero": "litre", "confianza": 0.5}], "fenologia": "en flor", "notas": "ok"}',
        },
      ],
    });

    const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.opciones[0].hospedero).toBe("quillay");
    expect(data.esQuintral).toBe(true);
    expect(data.opciones[0].confianza).toBe(0.9);
    expect(data.opciones[1].hospedero).toBe("litre");
    expect(data.opciones[1].confianza).toBe(0.5);
  });

  it("400 si falta la imagen", async () => {
    const res = await POST(req({ mediaType: "image/jpeg" }));
    expect(res.status).toBe(400);
  });

  it("400 si el mediaType no esta en la lista permitida", async () => {
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "application/pdf" }));
    expect(res.status).toBe(400);
  });

  it("400 si el base64 es invalido", async () => {
    const res = await POST(req({ imageBase64: "not-base64!!!", mediaType: "image/jpeg" }));
    expect(res.status).toBe(400);
  });

  it("413 si la imagen supera el maximo permitido", async () => {
    const oversized = "A".repeat(6 * 1024 * 1024);
    const res = await POST(req({ imageBase64: oversized, mediaType: "image/jpeg" }));
    expect(res.status).toBe(413);
  });

  it("429 si se excede el rate limit", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: '{"esQuintral":false,"opciones":[],"fenologia":"","notas":""}' }],
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));
      expect(res.status).toBe(200);
    }

    const blocked = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));
    expect(blocked.status).toBe(429);
  });

  it("500 si la IA falla", async () => {
    createMock.mockRejectedValue(new Error("boom"));
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));
    expect(res.status).toBe(500);
  });
});
