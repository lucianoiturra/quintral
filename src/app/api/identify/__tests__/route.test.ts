import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

import { POST } from "@/app/api/identify/route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/identify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/identify", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("devuelve un IdentifyResult normalizado", async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: 'Aquí está: {"esQuintral": true, "hospederoProbable": "quillay", "confianza": 0.9, "fenologia": "en flor", "notas": "ok"}',
        },
      ],
    });
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hospederoProbable).toBe("quillay");
    expect(data.esQuintral).toBe(true);
  });

  it("400 si falta la imagen", async () => {
    const res = await POST(req({ mediaType: "image/jpeg" }));
    expect(res.status).toBe(400);
  });

  it("500 si la IA falla", async () => {
    createMock.mockRejectedValue(new Error("boom"));
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "image/jpeg" }));
    expect(res.status).toBe(500);
  });

  it("400 si el mediaType no está en la lista permitida", async () => {
    const res = await POST(req({ imageBase64: "AAAA", mediaType: "application/pdf" }));
    expect(res.status).toBe(400);
  });
});
