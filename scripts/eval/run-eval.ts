/**
 * run-eval.ts
 * Corre el identificador sobre el dataset de evaluación y mide acierto top-1 / top-2.
 *
 * Uso:
 *   npx tsx scripts/eval/run-eval.ts             → deriva zona por latitud (modo principal)
 *   npx tsx scripts/eval/run-eval.ts --sin-zona  → sin pista geográfica (baseline)
 *
 * Prerequisitos:
 *   - ANTHROPIC_API_KEY en el entorno
 *   - npm run eval:fetch  (descarga fotos y escribe data/eval/manifest.json)
 */
import fs from "node:fs";
import path from "node:path";
import type { ManifestItem, ManifestMulti, ManifestMultiItem } from "@/lib/evalTypes";
import type { AllowedImageType } from "@/lib/imageMime";
import type { IdentifyResult } from "@/lib/types";
import { identificarHospedero } from "@/lib/identifyClient";
import { zonaPorLatitud } from "@/lib/zonas";

// ---------------------------------------------------------------------------
// Constantes a nivel de módulo
// ---------------------------------------------------------------------------

const DATASET_DIR = path.resolve("data/eval");
const RESULTS_DIR = path.resolve("eval/results");

// ---------------------------------------------------------------------------
// Helpers a nivel de módulo
// ---------------------------------------------------------------------------

function mediaTypePorExtension(archivo: string): AllowedImageType {
  const ext = archivo.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, AllowedImageType> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext] ?? "image/jpeg";
}

function selloDeTiempo(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

// ---------------------------------------------------------------------------
// Resultado de evaluación
// ---------------------------------------------------------------------------

export interface EvalItemResult {
  archivo: string;
  hospederoEsperado: string;
  resultado: IdentifyResult;
  aciertoTop1: boolean;
  aciertoTop2: boolean;
}

export interface EvalReport {
  fecha: string;
  modo: string;
  total: number;
  aciertoTop1: number;
  aciertoTop2: number;
  items: EvalItemResult[];
}

// ---------------------------------------------------------------------------
// evaluarManifiesto
// ---------------------------------------------------------------------------

export async function evaluarManifiesto(
  items: ManifestItem[],
  identificarItem: (item: ManifestItem) => Promise<IdentifyResult>,
): Promise<EvalReport> {
  const results: EvalItemResult[] = [];

  for (const item of items) {
    console.log(`  Procesando ${item.archivo} (${item.hospedero})…`);
    try {
      const resultado = await identificarItem(item);
      const aciertoTop1 = resultado.opciones[0].hospedero === item.hospedero;
      const aciertoTop2 =
        resultado.opciones[0].hospedero === item.hospedero ||
        resultado.opciones[1].hospedero === item.hospedero;
      results.push({ archivo: item.archivo, hospederoEsperado: item.hospedero, resultado, aciertoTop1, aciertoTop2 });
    } catch (err) {
      console.warn(`  Error procesando ${item.archivo}: ${err}`);
    }
  }

  const total = results.length;
  const aciertoTop1 = total > 0 ? results.filter((r) => r.aciertoTop1).length / total : 0;
  const aciertoTop2 = total > 0 ? results.filter((r) => r.aciertoTop2).length / total : 0;

  return {
    fecha: new Date().toISOString(),
    modo: "",
    total,
    aciertoTop1,
    aciertoTop2,
    items: results,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const sinZona = process.argv.includes("--sin-zona");
  const multi = process.argv.includes("--multi");

  if (multi) {
    const mPath = path.join(DATASET_DIR, "manifestMulti.json");
    if (!fs.existsSync(mPath)) {
      console.error("No existe data/eval/manifestMulti.json. Corre primero: npm run eval:fetch");
      process.exit(1);
    }
    const manifestMulti = JSON.parse(fs.readFileSync(mPath, "utf-8")) as ManifestMulti;

    const identificarItemMulti = async (item: ManifestMultiItem): Promise<IdentifyResult> => {
      const imagenes = item.archivos.map((archivo) => ({
        base64: fs.readFileSync(path.join(DATASET_DIR, archivo)).toString("base64"),
        mediaType: mediaTypePorExtension(archivo),
      }));
      const zona =
        !sinZona && typeof item.lat === "number" ? zonaPorLatitud(item.lat) : undefined;
      return identificarHospedero(imagenes, zona);
    };

    // Adapt multi items to ManifestItem shape for evaluarManifiesto
    const itemsAdaptados: ManifestItem[] = manifestMulti.items.map((it) => ({
      archivo: it.archivos[0],
      hospedero: it.hospedero,
      fuente: it.fuente,
      lat: it.lat,
      lng: it.lng,
    }));

    const multiMap = new Map(
      manifestMulti.items.map((it) => [it.archivos[0], it])
    );

    const resultado = await evaluarManifiesto(itemsAdaptados, (item) => {
      const original = multiMap.get(item.archivo);
      if (!original) throw new Error(`Item no encontrado en manifestMulti: ${item.archivo}`);
      return identificarItemMulti(original);
    });

    resultado.modo = sinZona ? "multi-sinzona" : "multi";

    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const sufijo = sinZona ? "multi-sinzona" : "multi";
    const salida = path.join(RESULTS_DIR, `${selloDeTiempo()}-${sufijo}.json`);
    fs.writeFileSync(salida, JSON.stringify(resultado, null, 2));
    console.log(`\nTotal evaluado (multi): ${resultado.total}`);
    console.log(`Acierto top-1: ${(resultado.aciertoTop1 * 100).toFixed(1)}%`);
    console.log(`Acierto top-2: ${(resultado.aciertoTop2 * 100).toFixed(1)}%`);
    console.log(`Modo: MULTI ${sinZona ? "(sin zona)" : "(con zona)"}`);
    console.log(`Resultado escrito en ${salida}`);
    return;
  }

  // Cargar manifiesto
  const manifestPath = path.join(DATASET_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`No se encontró el manifiesto: ${manifestPath}`);
    console.error("Ejecuta primero: npm run eval:fetch");
    process.exit(1);
  }
  const manifest: { items?: ManifestItem[] } | ManifestItem[] = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8"),
  );
  const items: ManifestItem[] = Array.isArray(manifest)
    ? manifest
    : (manifest.items ?? []);

  // identificarItem definida dentro de main para capturar sinZona
  const identificarItem = async (item: ManifestItem): Promise<IdentifyResult> => {
    const ruta = path.join(DATASET_DIR, item.archivo);
    const base64 = fs.readFileSync(ruta).toString("base64");
    const zona =
      !sinZona && typeof item.lat === "number" ? zonaPorLatitud(item.lat) : undefined;
    return identificarHospedero(
      [{ base64, mediaType: mediaTypePorExtension(item.archivo) }],
      zona,
    );
  };

  console.log(`Evaluando ${items.length} imágenes… modo: ${sinZona ? "SIN zona (baseline)" : "CON zona"}`);

  const resultado = await evaluarManifiesto(items, identificarItem);
  resultado.modo = sinZona ? "sinzona" : "conzona";

  // Guardar resultado
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const sufijo = sinZona ? "sinzona" : "conzona";
  const salida = path.join(RESULTS_DIR, `${selloDeTiempo()}-${sufijo}.json`);
  fs.writeFileSync(salida, JSON.stringify(resultado, null, 2));

  // Resumen
  console.log(`\nTotal evaluado : ${resultado.total}`);
  console.log(`Acierto top-1  : ${(resultado.aciertoTop1 * 100).toFixed(1)}%`);
  console.log(`Acierto top-2  : ${(resultado.aciertoTop2 * 100).toFixed(1)}%`);
  console.log(`Resultado guardado en: ${salida}`);
  console.log(`Modo: ${sinZona ? "SIN zona (baseline)" : "CON zona"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
