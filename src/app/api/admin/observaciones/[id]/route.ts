import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/lib/server/adminAuth";
import { mapRowToObservation, type ObservacionRow } from "@/lib/observations";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

type AdminAction =
  | { action: "toggle_oculta" }
  | { action: "toggle_verificada" }
  | {
      action: "edit";
      fields?: {
        hospedero?: unknown;
        fenologia?: unknown;
        cerro?: unknown;
        altitud?: unknown;
        exposicion_solar?: unknown;
        notas_admin?: unknown;
      };
    };

export const runtime = "nodejs";

async function requireAdminSession(): Promise<Response | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (await isValidSession(session)) return null;
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

async function insertAdminLog(
  observacionId: string,
  accion: string,
  detalle: Record<string, unknown> | null = null,
): Promise<void> {
  await getSupabaseAdmin().from("admin_log").insert({
    observacion_id: observacionId,
    accion,
    detalle,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  let body: AdminAction;
  try {
    body = (await request.json()) as AdminAction;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const currentRes = await admin.from("observaciones").select("*").eq("id", id).single();
  if (currentRes.error || !currentRes.data) {
    return NextResponse.json({ error: "Observacion no encontrada" }, { status: 404 });
  }

  const current = currentRes.data as ObservacionRow;

  if (body.action === "toggle_oculta") {
    const { data, error } = await admin
      .from("observaciones")
      .update({ oculta: !current.oculta, editado_en: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo actualizar" },
        { status: 500 },
      );
    }

    await insertAdminLog(id, data.oculta ? "ocultada" : "mostrada", { oculta: data.oculta });
    return NextResponse.json(mapRowToObservation(data as ObservacionRow));
  }

  if (body.action === "toggle_verificada") {
    const { data, error } = await admin
      .from("observaciones")
      .update({ verificada: !current.verificada, editado_en: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo actualizar" },
        { status: 500 },
      );
    }

    await insertAdminLog(id, data.verificada ? "verificada" : "desverificada", {
      verificada: data.verificada,
    });
    return NextResponse.json(mapRowToObservation(data as ObservacionRow));
  }

  if (body.action !== "edit") {
    return NextResponse.json({ error: "Accion no soportada" }, { status: 400 });
  }

  const fields = body.fields ?? {};
  const update = {
    hospedero: typeof fields.hospedero === "string" ? fields.hospedero : current.hospedero,
    fenologia: typeof fields.fenologia === "string" ? fields.fenologia : current.fenologia,
    cerro: typeof fields.cerro === "string" ? fields.cerro || null : current.cerro,
    altitud:
      typeof fields.altitud === "number" || fields.altitud === null
        ? fields.altitud
        : current.altitud,
    exposicion_solar:
      typeof fields.exposicion_solar === "string"
        ? fields.exposicion_solar || null
        : current.exposicion_solar,
    notas_admin:
      typeof fields.notas_admin === "string" ? fields.notas_admin || null : current.notas_admin,
    editado_en: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("observaciones")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo actualizar" },
      { status: 500 },
    );
  }

  await insertAdminLog(id, "editada", update);
  return NextResponse.json(mapRowToObservation(data as ObservacionRow));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("observaciones").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("admin_log").insert({
    observacion_id: id,
    accion: "borrada",
    detalle: null,
  });

  return NextResponse.json({ ok: true });
}
