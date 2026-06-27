import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function imagenes(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      base64: "AAAA" + i,
      mediaType: "image/jpeg",
    }));
  }

  it("devuelve un IdentifyResult normalizado", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"esQuintral": true, "opciones": [{"hospedero": "quillay", "confianza": 0.9}, {"hospedero": "litre", "confianza": 0.5}], "fenologia": "en flor", "notas": "ok"}',
        },
      ],
    });
    const res = await POST(req({ imagenes: imagenes(1) }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.opciones[0].hospedero).toBe("quillay");
  });

  it("400 si no hay imágenes", async () => {
    const res = await POST(req({ imagenes: [] }));
    expect(res.status).toBe(400);
  });

  it("400 si algún mediaType no está permitido", async () => {
    const res = await POST(req({ imagenes: [{ base64: "AAAA", mediaType: "application/pdf" }] }));
    expect(res.status).toBe(400);
  });

  it("usa a lo más 4 imágenes aunque lleguen más", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    await POST(req({ imagenes: imagenes(6) }));
    const arg = createMock.mock.calls[0][0];
    const imgs = (arg.messages[0].content as { type: string }[]).filter((b) => b.type === "image");
    expect(imgs).toHaveLength(4);
  });

  it("500 si la IA falla", async () => {
    createMock.mockRejectedValue(new Error("boom"));
    const res = await POST(req({ imagenes: imagenes(1) }));
    expect(res.status).toBe(500);
  });

  it("429 si se excede el rate limit", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "{}" }] });
    for (let i = 0; i < 10; i++) {
      await POST(req({ imagenes: imagenes(1) }));
    }
    const blocked = await POST(req({ imagenes: imagenes(1) }));
    expect(blocked.status).toBe(429);
  });
});
