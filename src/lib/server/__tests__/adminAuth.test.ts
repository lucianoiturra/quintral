import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword, isValidSession } from "@/lib/server/adminAuth";

describe("hashPassword", () => {
  it("devuelve string hexadecimal de 64 caracteres", async () => {
    const hash = await hashPassword("mi-clave");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("es determinista para la misma entrada", async () => {
    expect(await hashPassword("abc")).toBe(await hashPassword("abc"));
  });

  it("produce hashes distintos para entradas distintas", async () => {
    expect(await hashPassword("a")).not.toBe(await hashPassword("b"));
  });
});

describe("isValidSession", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "secret123";
  });

  it("acepta el hash correcto de la contrasena de entorno", async () => {
    const hash = await hashPassword("secret123");
    expect(await isValidSession(hash)).toBe(true);
  });

  it("rechaza undefined", async () => {
    expect(await isValidSession(undefined)).toBe(false);
  });

  it("rechaza un hash incorrecto", async () => {
    expect(
      await isValidSession("0000000000000000000000000000000000000000000000000000000000000000"),
    ).toBe(false);
  });
});
