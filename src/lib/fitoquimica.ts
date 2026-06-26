export type Compuesto = "polifenoles" | "flavonoides" | "antocianinas";

export interface MetaCompuesto {
  id: Compuesto;
  etiqueta: string;
  unidad: string;
}

export type Fuente = "medido" | "literatura";

export interface MuestraFito {
  id: string;
  etiqueta: string;
  codigo: string; // código interno de laboratorio
  fuente: Fuente;
  cita: string;
  valores: Record<Compuesto, number | null>; // null = no determinado (n/d)
}

export const COMPUESTOS: MetaCompuesto[] = [
  { id: "polifenoles", etiqueta: "Polifenoles totales", unidad: "mg EAG/g" },
  { id: "flavonoides", etiqueta: "Flavonoides totales", unidad: "mg QE/g" },
  { id: "antocianinas", etiqueta: "Antocianinas totales", unidad: "mg Cy3Glu/g" },
];

export const MUESTRAS: MuestraFito[] = [
  {
    id: "muestra-1",
    etiqueta: "Muestra 1",
    codigo: "S-218-25",
    fuente: "medido",
    cita: "Estudio propio 2025",
    valores: { polifenoles: 52.8, flavonoides: 50.0, antocianinas: null },
  },
  {
    id: "muestra-2",
    etiqueta: "Muestra 2",
    codigo: "S-219-25",
    fuente: "medido",
    cita: "Estudio propio 2025",
    valores: { polifenoles: 52.8, flavonoides: 49.5, antocianinas: null },
  },
];

export const NOTA_LITERATURA =
  "Torres et al. (INACAP, Chile) observaron que el árbol hospedero modifica el " +
  "contenido de fenoles, flavonoides y poder reductor del quintral (maqui, huayún " +
  "y álamo). La fuente no publica valores numéricos; la comparación cuantitativa " +
  "entre hospederos es el objetivo de la fase 2026.";

function valoresMedidos(c: Compuesto): number[] {
  return MUESTRAS.map((m) => m.valores[c]).filter(
    (v): v is number => v !== null,
  );
}

export function promedioCompuesto(c: Compuesto): number | null {
  const vals = valoresMedidos(c);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function maxCompuesto(c: Compuesto): number {
  const vals = valoresMedidos(c);
  return vals.length ? Math.max(...vals) : 0;
}

export const PERFIL_REFERENCIA: Record<Compuesto, number | null> = {
  polifenoles: promedioCompuesto("polifenoles"),
  flavonoides: promedioCompuesto("flavonoides"),
  antocianinas: promedioCompuesto("antocianinas"),
};
