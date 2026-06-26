import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/server/adminAuth";

type LoginBody = {
  password?: unknown;
};

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", await hashPassword(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
