export interface INatObservation {
  id: number;
  uri?: string;
  location?: string; // "lat,lng"
  photos: { id: number; url: string }[];
}

export function urlsDeFotos(
  observaciones: INatObservation[],
  max: number,
): { id: number; url: string; fuente: string; lat?: number; lng?: number }[] {
  const out: { id: number; url: string; fuente: string; lat?: number; lng?: number }[] = [];
  for (const obs of observaciones) {
    const foto = obs.photos?.[0];
    if (!foto) continue;
    let lat: number | undefined;
    let lng: number | undefined;
    if (obs.location) {
      const [la, ln] = obs.location.split(",").map(Number);
      if (Number.isFinite(la) && Number.isFinite(ln)) {
        lat = la;
        lng = ln;
      }
    }
    out.push({
      id: obs.id,
      url: foto.url.replace("/square.", "/medium.").replace("/thumb.", "/medium."),
      fuente: obs.uri ?? `https://www.inaturalist.org/observations/${obs.id}`,
      lat,
      lng,
    });
    if (out.length >= max) break;
  }
  return out;
}
