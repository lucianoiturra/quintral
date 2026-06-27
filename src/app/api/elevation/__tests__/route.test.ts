import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/elevation/route";

function req(qs: string): Request {
  return new Request(`http://localhost/api/elevation${qs}`);
}

describe("GET /api/elevation", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("devuelve la elevación redondeada", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ elevation: [1234.7] }), { status: 200 }),
    );
    const res = await GET(req("?lat=-33.2&lng=-70.3"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ elevation: 1235 });
  });

  it("rechaza coordenadas inválidas con 400", async () => {
    const res = await GET(req("?lat=abc&lng=-70.3"));
    expect(res.status).toBe(400);
  });

  it("devuelve 502 si el proveedor falla", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    const res = await GET(req("?lat=-33.2&lng=-70.3"));
    expect(res.status).toBe(502);
  });
});
