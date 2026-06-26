import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/lib/server/adminAuth";
import { mapRowToObservation, type ObservacionRow } from "@/lib/observations";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!(await isValidSession(session))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("observaciones")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(((data ?? []) as ObservacionRow[]).map(mapRowToObservation));
}
