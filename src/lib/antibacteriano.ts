export type Hospedero = "litre" | "quillay";
export type BacteriaId = "e-coli" | "s-aureus" | "e-faecalis";

export interface Bacteria {
  id: BacteriaId;
  nombre: string; // nombre científico
  cepa: string; // "ATCC 25922"
  gram: "positiva" | "negativa";
}

export interface PuntoOD {
  concentracion: number; // µg/mL de extracto (0 = control de crecimiento)
  od: number; // absorbancia a 600 nm (media leída de figura)
}

export interface CurvaOD {
  bacteria: BacteriaId;
  hospedero: Hospedero;
  puntos: PuntoOD[];
  controlPos: number; // C+ ampicilina
  controlNeg: number; // C- solo medio
}

export interface FiguraAntibiograma {
  bacteria: BacteriaId;
  hospedero: Hospedero | "ampicilina"; // ampicilina = placa control
  archivo: string; // ruta pública
  pie: string;
}

export const CONCENTRACIONES = [0, 128, 256, 512, 1024];

export const BACTERIAS: Bacteria[] = [
  { id: "e-coli", nombre: "Escherichia coli", cepa: "ATCC 25922", gram: "negativa" },
  { id: "s-aureus", nombre: "Staphylococcus aureus", cepa: "ATCC 25923", gram: "positiva" },
  { id: "e-faecalis", nombre: "Enterococcus faecalis", cepa: "ATCC 29212", gram: "positiva" },
];

function curva(
  bacteria: BacteriaId,
  hospedero: Hospedero,
  ods: number[],
  controlPos: number,
  controlNeg: number,
): CurvaOD {
  return {
    bacteria,
    hospedero,
    puntos: CONCENTRACIONES.map((concentracion, i) => ({
      concentracion,
      od: ods[i],
    })),
    controlPos,
    controlNeg,
  };
}

// Medias de OD (600 nm) leídas de las figuras del informe 2026.
export const CURVAS: CurvaOD[] = [
  curva("e-coli", "litre", [0.5, 0.62, 0.51, 0.53, 0.69], 0.06, 0.06),
  curva("e-coli", "quillay", [0.61, 0.55, 0.54, 0.52, 0.66], 0.06, 0.05),
  curva("s-aureus", "litre", [0.36, 0.34, 0.37, 0.46, 0.4], 0.07, 0.06),
  curva("s-aureus", "quillay", [0.25, 0.29, 0.32, 0.31, 0.31], 0.075, 0.065),
  curva("e-faecalis", "litre", [0.14, 0.19, 0.16, 0.185, 0.25], 0.063, 0.059),
  curva("e-faecalis", "quillay", [0.125, 0.173, 0.148, 0.174, 0.199], 0.063, 0.059),
];

export const ANTIBIOGRAMAS: FiguraAntibiograma[] = [
  {
    bacteria: "e-coli",
    hospedero: "ampicilina",
    archivo: "/figuras/antibacteriano/antibiograma-e-coli-ampicilina.jpg",
    pie: "E. coli con discos de ampicilina (control +): halos de inhibición amplios.",
  },
  {
    bacteria: "e-coli",
    hospedero: "litre",
    archivo: "/figuras/antibacteriano/antibiograma-e-coli-litre.jpg",
    pie: "E. coli con discos de extracto de litre (1024 µg): sin halo apreciable.",
  },
  {
    bacteria: "s-aureus",
    hospedero: "quillay",
    archivo: "/figuras/antibacteriano/antibiograma-s-aureus-quillay.jpg",
    pie: "S. aureus con discos de extracto de quillay (1024 µg): halo leve alrededor de un disco.",
  },
  {
    bacteria: "e-faecalis",
    hospedero: "litre",
    archivo: "/figuras/antibacteriano/antibiograma-e-faecalis-litre.jpg",
    pie: "E. faecalis con discos de extracto de litre (1024 µg): sin halo apreciable.",
  },
];

export const NOTA_DATOS =
  "Medias de OD (600 nm) leídas de las figuras del informe 2026 " +
  "(aproximadas, sin desviación estándar). Ensayos por triplicado. " +
  "C+ = ampicilina, C− = solo medio de cultivo.";

export function bacteria(id: BacteriaId): Bacteria {
  const b = BACTERIAS.find((x) => x.id === id);
  if (!b) throw new Error(`Bacteria desconocida: ${id}`);
  return b;
}

export function curvasDeBacteria(id: BacteriaId): CurvaOD[] {
  return CURVAS.filter((c) => c.bacteria === id);
}

export function antibiogramasDeBacteria(id: BacteriaId): FiguraAntibiograma[] {
  return ANTIBIOGRAMAS.filter((a) => a.bacteria === id);
}
