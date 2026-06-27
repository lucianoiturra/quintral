const PROVEEDOR = "https://api.open-meteo.com/v1/elevation";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return Response.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  try {
    const res = await fetch(`${PROVEEDOR}?latitude=${lat}&longitude=${lng}`);
    if (!res.ok) return Response.json({ error: "Proveedor de elevación no disponible." }, { status: 502 });
    const data = (await res.json()) as { elevation?: number[] };
    const valor = data.elevation?.[0];
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      return Response.json({ error: "Respuesta de elevación inválida." }, { status: 502 });
    }
    return Response.json({ elevation: Math.round(valor) });
  } catch {
    return Response.json({ error: "Proveedor de elevación no disponible." }, { status: 502 });
  }
}
