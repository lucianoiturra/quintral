export type ZonaId = "norte" | "centro" | "sur";

export interface Zona {
  id: ZonaId;
  etiqueta: string;
  pista: string;
}

export const ZONAS: Zona[] = [
  {
    id: "norte",
    etiqueta: "Norte Chico (Atacama–Coquimbo)",
    pista:
      "Desierto costero y matorral; dominan cactáceas columnares (quisco, quisco-coquimbano, eulychnia, pingo-pingo, quisquito).",
  },
  {
    id: "centro",
    etiqueta: "Chile central (Valparaíso–Maule)",
    pista:
      "Matorral y bosque esclerófilo; dominan quillay, litre, peumo, boldo, maitén, huingán, colliguay, crucero, corcolén.",
  },
  {
    id: "sur",
    etiqueta: "Centro-sur y sur (Ñuble–Los Lagos)",
    pista:
      "Bosque templado lluvioso y caducifolio; dominan coihue, nothofagus-nitida, arrayán, maqui, chacay, barraco.",
  },
];

export function zonaPorId(id: string): Zona | undefined {
  return ZONAS.find((z) => z.id === id);
}

export function zonaPorLatitud(lat: number): Zona {
  // Chile: latitudes negativas; más negativo = más al sur.
  if (lat > -31.5) return ZONAS[0]; // norte
  if (lat > -36) return ZONAS[1]; // centro  (incluye exactamente -31.5)
  return ZONAS[2]; // sur (incluye exactamente -36)
}
