import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/lib/server/adminAuth";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

const MAX_IDS = 5000;
/**
 * Cuántos ids se borran por petición a PostgREST. El filtro .in() viaja en la
 * URL, así que cientos de UUID la hacen tan larga que el servidor la rechaza.
 * Borramos en lotes para no pasarnos del límite de longitud.
 */
const BATCH_SIZE = 100;

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!(await isValidSession(session))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { ids?: unknown };
  try {
    body = (await request.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Sin ids para borrar" }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: `Máximo ${MAX_IDS} por lote` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const lote = ids.slice(i, i + BATCH_SIZE);
    const { error } = await admin.from("observaciones").delete().in("id", lote);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await admin.from("admin_log").insert({
    observacion_id: null,
    accion: "borrado_masivo",
    detalle: { cantidad: ids.length },
  });

  return NextResponse.json({ ok: true, borradas: ids.length });
}
