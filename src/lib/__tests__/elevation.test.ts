import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchElevation } from "@/lib/elevation";

describe("fetchElevation", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("devuelve el entero de elevación cuando responde OK", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ elevation: 1235 }), { status: 200 }),
    );
    expect(await fetchElevation(-33.2, -70.3)).toBe(1235);
  });

  it("devuelve null cuando el endpoint falla", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("x", { status: 502 }));
    expect(await fetchElevation(-33.2, -70.3)).toBeNull();
  });

  it("devuelve null cuando fetch lanza", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(await fetchElevation(-33.2, -70.3)).toBeNull();
  });
});
