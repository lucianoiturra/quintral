export interface ResultadoBacteria {
  bacteria: string;
  inhibicion: false;
}

export const RESULTADOS: ResultadoBacteria[] = [
  { bacteria: "Escherichia coli ATCC 25922", inhibicion: false },
  { bacteria: "Staphylococcus aureus ATCC 25923", inhibicion: false },
  { bacteria: "Enterococcus faecalis ATCC 29212", inhibicion: false },
];

export const CONCENTRACIONES = [128, 256, 512, 1024]; // µg/mL
export const CONTROL_POSITIVO = "ampicilina";
export const CONTROL_NEGATIVO = "medio de cultivo";
export const HOSPEDEROS_ENSAYADOS = ["litre", "quillay"];

export const NOTA_LITERATURA =
  "La literatura ha evaluado la actividad antimicrobiana del quintral frente a " +
  "Escherichia coli (Gram negativa), Staphylococcus aureus (Gram positiva) y " +
  "Enterococcus faecalis (Gram positiva). Los resultados publicados no son uniformes: " +
  "algunos estudios reportan actividad según el hospedero, el solvente de extracción, " +
  "la parte de la planta y la concentración del extracto. Por eso sigue siendo un tema " +
  "de investigación en desarrollo.";

export const FACTORES = [
  "La especie del árbol hospedero.",
  "La concentración del extracto.",
  "El solvente de extracción utilizado.",
  "La parte de la planta analizada (hojas, flores o frutos).",
  "La especie bacteriana evaluada.",
];

export const LINEAS_FUTURAS = [
  "Comparar el quintral hospedado en otras especies nativas e introducidas.",
  "Analizar el contenido de polifenoles y flavonoides antes de los ensayos antimicrobianos.",
  "Evaluar otros métodos de extracción (metanol, acetona o extracción asistida por ultrasonido).",
  "Ensayar concentraciones mayores o extractos fraccionados.",
  "Evaluar otras bacterias de interés clínico o ambiental.",
  "Identificar mediante HPLC-MS o LC-MS los compuestos responsables de la actividad biológica.",
];

export const APRENDIZAJE =
  "Los extractos etanólicos de quintral hospedado en litre y quillay no mostraron " +
  "actividad antimicrobiana frente a E. coli, S. aureus y E. faecalis en las condiciones " +
  "evaluadas. Este resultado aporta evidencia científica valiosa y orienta futuras " +
  "investigaciones hacia otros hospederos, métodos de extracción o concentraciones, " +
  "demostrando que la ausencia de efecto también contribuye al conocimiento científico.";
