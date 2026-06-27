/** Pide la altitud del terreno al endpoint propio. Devuelve null si no hay red o falla. */
export async function fetchElevation(lat: number, lng: number): Promise<number | null> {
  try {
    const res = await fetch(`/api/elevation?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { elevation?: number };
    return typeof data.elevation === "number" ? data.elevation : null;
  } catch {
    return null;
  }
}
