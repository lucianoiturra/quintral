export interface INatObservation {
  id: number;
  uri?: string;
  location?: string; // "lat,lng"
  photos: { id: number; url: string }[];
}

function aMedium(url: string): string {
  return url.replace("/square.", "/medium.").replace("/thumb.", "/medium.");
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
      url: aMedium(foto.url),
      fuente: obs.uri ?? `https://www.inaturalist.org/observations/${obs.id}`,
      lat,
      lng,
    });
    if (out.length >= max) break;
  }
  return out;
}

export function gruposDeFotos(
  observaciones: INatObservation[],
  maxObs: number,
  fotosPorObs: number,
): { id: number; urls: string[]; fuente: string; lat?: number; lng?: number }[] {
  const out: { id: number; urls: string[]; fuente: string; lat?: number; lng?: number }[] = [];
  for (const obs of observaciones) {
    const fotos = (obs.photos ?? []).slice(0, fotosPorObs);
    if (fotos.length === 0) continue;
    let lat: number | undefined;
    let lng: number | undefined;
    if (obs.location) {
      const [la, ln] = obs.location.split(",").map(Number);
      if (Number.isFinite(la) && Number.isFinite(ln)) { lat = la; lng = ln; }
    }
    out.push({
      id: obs.id,
      urls: fotos.map((f) => aMedium(f.url)),
      fuente: obs.uri ?? `https://www.inaturalist.org/observations/${obs.id}`,
      lat,
      lng,
    });
    if (out.length >= maxObs) break;
  }
  return out;
}
