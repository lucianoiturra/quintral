import type { Hospedero } from "@/lib/antibacteriano";

export type AisladoId = "lf89" | "cgro2" | "12201";

export interface Aislado {
  id: AisladoId;
  nombre: string; // cómo se llama en el informe
  etiqueta: string; // subtítulo corto
  microplaca: string; // foto de la microplaca
  pieMicroplaca: string;
}

/** Significancia respecto al control de crecimiento (0 µg/mL). */
export type Signif = "ns" | "*" | "**" | "***";

export interface CurvaSalmonis {
  aislado: AisladoId;
  hospedero: Hospedero;
  od: number[]; // una por concentración
  signif: (Signif | null)[]; // null en el control (0 µg/mL)
  controlPos: number; // florfenicol 2 µg/mL
}

export const CONCENTRACIONES = [0, 2, 4, 8, 16, 32, 64, 128];
export const CONTROL_POSITIVO = "florfenicol 2 µg/mL";

export const AISLADOS: Aislado[] = [
  {
    id: "lf89",
    nombre: "LF-89",
    etiqueta: "Cepa de referencia",
    microplaca: "/figuras/salmonis/microplaca-lf89.jpg",
    pieMicroplaca:
      "Microplaca de P. salmonis LF-89 con las distintas concentraciones de extracto (128 a 0 µg/mL), más los controles C+ y C−.",
  },
  {
    id: "cgro2",
    nombre: "CGRO2",
    etiqueta: "Aislado de campo",
    microplaca: "/figuras/salmonis/microplaca-cgro2.jpg",
    pieMicroplaca:
      "Microplaca de P. salmonis CGRO2 con las distintas concentraciones de extracto (128 a 0 µg/mL), más los controles C+ y C−.",
  },
  {
    id: "12201",
    nombre: "12201",
    etiqueta: "Aislado de campo",
    microplaca: "/figuras/salmonis/microplaca-12201.jpg",
    pieMicroplaca:
      "Microplaca de P. salmonis 12201 con las distintas concentraciones de extracto (128 a 0 µg/mL), más los controles C+ y C−.",
  },
];

// Medias de OD (600 nm) leídas de las figuras 1 a 6 del informe de P. salmonis.
export const CURVAS: CurvaSalmonis[] = [
  {
    aislado: "lf89",
    hospedero: "litre",
    od: [0.61, 0.593, 0.62, 0.607, 0.625, 0.587, 0.39, 0.163],
    signif: [null, "ns", "ns", "ns", "ns", "ns", "**", "***"],
    controlPos: 0.01,
  },
  {
    aislado: "lf89",
    hospedero: "quillay",
    od: [0.68, 0.71, 0.577, 0.7, 0.65, 0.593, 0.568, 0.403],
    signif: [null, "ns", "*", "ns", "ns", "*", "*", "**"],
    controlPos: 0.01,
  },
  {
    aislado: "cgro2",
    hospedero: "litre",
    od: [0.51, 0.436, 0.477, 0.39, 0.32, 0.217, 0.17, 0.108],
    signif: [null, "*", "ns", "**", "**", "**", "***", "***"],
    controlPos: 0.005,
  },
  {
    aislado: "cgro2",
    hospedero: "quillay",
    od: [0.503, 0.48, 0.545, 0.47, 0.446, 0.37, 0.223, 0.21],
    signif: [null, "ns", "ns", "**", "***", "**", "**", "***"],
    controlPos: 0.005,
  },
  {
    aislado: "12201",
    hospedero: "litre",
    od: [0.775, 0.693, 0.458, 0.274, 0.295, 0.267, 0.213, 0.16],
    signif: [null, "ns", "**", "***", "**", "***", "***", "***"],
    controlPos: 0.014,
  },
  {
    aislado: "12201",
    hospedero: "quillay",
    od: [0.775, 0.633, 0.458, 0.444, 0.288, 0.277, 0.28, 0.246],
    signif: [null, "ns", "***", "*", "**", "***", "***", "***"],
    controlPos: 0.014,
  },
];

/** Resumen por aislado que acompaña al gráfico. */
export const LECTURA: Record<AisladoId, string> = {
  lf89:
    "Es el aislado más resistente: entre 2 y 32 µg/mL el crecimiento casi no cambia y la caída " +
    "solo aparece a 64 y 128 µg/mL. Frente al extracto de quillay la respuesta es irregular y más débil.",
  cgro2:
    "Responde de forma progresiva: desde 8 µg/mL el crecimiento baja a medida que sube la concentración, " +
    "con ambos extractos. El de litre es claramente el más potente.",
  "12201":
    "Es el aislado más sensible: ya desde 4 µg/mL hay una reducción significativa y luego el efecto " +
    "se estabiliza en una meseta. Litre vuelve a quedar por delante de quillay.",
};

export const NOTA_DATOS =
  "Medias de OD (600 nm) leídas de las figuras del informe de P. salmonis " +
  "(aproximadas, sin desviación estándar). Ensayos por triplicado. " +
  `C+ = ${CONTROL_POSITIVO}. Significancia respecto al control sin extracto: ` +
  "ns = no significativo, * p<0,05, ** p<0,01, *** p<0,001.";

export const HALLAZGO =
  "Los extractos etanólicos de quintral sí inhibieron el crecimiento de Piscirickettsia salmonis in vitro, " +
  "con una respuesta que depende de la concentración, del aislado bacteriano y del árbol hospedero: " +
  "el quintral crecido sobre litre redujo más el crecimiento que el crecido sobre quillay. " +
  "Es un resultado a favor de la hipótesis de dependencia fitoquímica.";

export const CAUTELAS = [
  "El ensayo mide reducción del crecimiento, no muerte bacteriana: todavía no se puede afirmar que el extracto sea bactericida.",
  "Incluso a 128 µg/mL queda absorbancia residual, así que la CIM aún no está determinada (sería mayor a 128 µg/mL).",
  "Parte de esa absorbancia residual podría venir del color del propio extracto: falta un blanco de extracto sin bacteria.",
  "Para afirmar que litre supera a quillay falta comparar ambos extractos entre sí, no solo cada uno contra su control.",
  "El extracto no reemplaza al florfenicol ni se ha probado en salmones.",
];

export function aislado(id: AisladoId): Aislado {
  const a = AISLADOS.find((x) => x.id === id);
  if (!a) throw new Error(`Aislado desconocido: ${id}`);
  return a;
}

export function curvasDeAislado(id: AisladoId): CurvaSalmonis[] {
  return CURVAS.filter((c) => c.aislado === id);
}

/** % de inhibición a la concentración máxima respecto al control sin extracto. */
export function inhibicionMaxima(c: CurvaSalmonis): number {
  const control = c.od[0];
  const maxima = c.od[c.od.length - 1];
  return Math.round((1 - maxima / control) * 100);
}
