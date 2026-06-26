import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { normalizeObservationInput } from "@/lib/observationPayload";
import {
  assertTrustedOrigin,
  enforceRateLimit,
  readJsonBody,
} from "@/lib/server/requestSecurity";

export const runtime = "nodejs";

const MAX_OBSERVATION_BYTES = 32 * 1024;

export async function POST(request: Request): Promise<Response> {
  const originError = assertTrustedOrigin(request);
  if (originError) return originError;

  const rateLimitError = enforceRateLimit(request, "observations", 15, 60_000);
  if (rateLimitError) return rateLimitError;

  const parsed = await readJsonBody<unknown>(request, MAX_OBSERVATION_BYTES);
  if (!parsed.ok) return parsed.response;

  const normalized = normalizeObservationInput(parsed.value);
  if (!normalized.value) {
    return Response.json({ errors: normalized.errors }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("observaciones")
      .insert({
        nombre_observador: normalized.value.nombreObservador,
        lat: normalized.value.lat,
        lng: normalized.value.lng,
        hospedero: normalized.value.hospedero,
        hospedero_otro: normalized.value.hospederoOtro,
        fenologia: normalized.value.fenologia,
        altitud: normalized.value.altitud,
        exposicion_solar: normalized.value.exposicionSolar,
        foto_url: normalized.value.fotoUrl,
        resultado_ia: normalized.value.resultadoIa,
        cerro: normalized.value.cerro,
      })
      .select("*")
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo guardar la observacion." }, { status: 500 });
  }
}
