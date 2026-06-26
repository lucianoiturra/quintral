import {
  ALLOWED_IMAGE_TYPES,
  assertTrustedOrigin,
  enforceRateLimit,
  getExtensionForMimeType,
  type AllowedImageType,
} from "@/lib/server/requestSecurity";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const originError = assertTrustedOrigin(request);
  if (originError) return originError;

  const rateLimitError = enforceRateLimit(request, "photo-upload", 10, 60_000);
  if (rateLimitError) return rateLimitError;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FILE_BYTES + 32 * 1024) {
    return Response.json({ error: "La imagen es demasiado grande. Maximo 4 MB." }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo." }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    return Response.json({ error: "Solo se aceptan imagenes JPG, PNG o WEBP." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "La imagen es demasiado grande. Maximo 4 MB." }, { status: 413 });
  }

  const mediaType = file.type as AllowedImageType;
  const ruta = `${crypto.randomUUID()}.${getExtensionForMimeType(mediaType)}`;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from("fotos").upload(ruta, file, {
      contentType: mediaType,
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from("fotos").getPublicUrl(ruta);
    return Response.json({ url: data.publicUrl }, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo subir la foto." }, { status: 500 });
  }
}
