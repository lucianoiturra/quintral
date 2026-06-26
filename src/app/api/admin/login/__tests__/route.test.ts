import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/adminAuth", () => ({
  hashPassword: vi.fn().mockResolvedValue(
    "FAKEHASH64AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ),
}));

import { POST as postLogin } from "@/app/api/admin/login/route";
import { POST as postLogout } from "@/app/api/admin/logout/route";

function loginReq(password: string): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "secret123";
    vi.clearAllMocks();
  });

  it("devuelve 200 y establece cookie cuando la contrasena es correcta", async () => {
    const response = await postLogin(loginReq("secret123"));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("admin_session=");
  });

  it("devuelve 401 cuando la contrasena es incorrecta", async () => {
    const response = await postLogin(loginReq("wrong"));
    expect(response.status).toBe(401);
  });
});

describe("POST /api/admin/logout", () => {
  it("devuelve 200 y expira la cookie", async () => {
    const response = await postLogout();
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
