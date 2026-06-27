/**
 * fetch-dataset.ts
 * Descarga fotos de iNaturalist para cada especie hospedera y escribe
 * el manifiesto JSON en data/eval/manifest.json.
 *
 * Uso: npx tsx scripts/eval/fetch-dataset.ts
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { urlsDeFotos, gruposDeFotos, type INatObservation } from "./inaturalist";
import type { ManifestItem, ManifestMulti, ManifestMultiItem } from "@/lib/evalTypes";
import type { Host } from "@/lib/types";

const ESPECIES: { slug: Host; taxonId: number }[] = [
  { slug: "quillay", taxonId: 82621 },
  { slug: "litre", taxonId: 82622 },
  { slug: "peumo", taxonId: 82623 },
  { slug: "boldo", taxonId: 77958 },
  { slug: "maqui", taxonId: 62891 },
];

const MAX_POR_ESPECIE = 20;
const FOTOS_POR_OBS = 3;
const OUT_DIR = path.resolve("data/eval/fotos");
const MANIFEST_PATH = path.resolve("data/eval/manifest.json");
const MANIFEST_MULTI_PATH = path.resolve("data/eval/manifestMulti.json");

function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "QuintralInsight/eval" } }, (res) => {
      let body = "";
      res.on("data", (chunk: string) => (body += chunk));
      res.on("end", () => resolve(body));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "QuintralInsight/eval" } }, (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function fetchObservaciones(taxonId: number): Promise<INatObservation[]> {
  const url =
    `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}` +
    `&quality_grade=research&photos=true&per_page=${MAX_POR_ESPECIE}&order=desc&order_by=created_at`;
  const raw = await get(url);
  const json = JSON.parse(raw) as { results: INatObservation[] };
  return json.results ?? [];
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const items: ManifestItem[] = [];
  const itemsMulti: ManifestMultiItem[] = [];

  for (const especie of ESPECIES) {
    console.log(`Fetching ${especie.slug} (taxon ${especie.taxonId})…`);
    const observaciones = await fetchObservaciones(especie.taxonId);
    const fotos = urlsDeFotos(observaciones, MAX_POR_ESPECIE);

    for (const foto of fotos) {
      const ext = foto.url.split(".").pop() ?? "jpg";
      const nombre = `${especie.slug}-${foto.id}.${ext}`;
      const dest = path.join(OUT_DIR, nombre);
      const archivoRel = `fotos/${nombre}`;

      if (!fs.existsSync(dest)) {
        try {
          await downloadFile(foto.url, dest);
        } catch (err) {
          console.warn(`  Skip ${nombre}: ${err}`);
          continue;
        }
      }

      items.push({
        archivo: archivoRel,
        hospedero: especie.slug,
        fuente: foto.fuente,
        lat: foto.lat,
        lng: foto.lng,
      });
    }

    const grupos = gruposDeFotos(observaciones, MAX_POR_ESPECIE, FOTOS_POR_OBS).filter(
      (g) => g.urls.length >= 2,
    );
    for (const g of grupos) {
      const archivos: string[] = [];
      for (let i = 0; i < g.urls.length; i++) {
        const archivoRel = `fotos/${especie.slug}-${g.id}-${i}.jpg`;
        const dest = path.join(OUT_DIR, `${especie.slug}-${g.id}-${i}.jpg`);
        if (!fs.existsSync(dest)) {
          try {
            await downloadFile(g.urls[i], dest);
          } catch (err) {
            console.warn(`  Skip multi ${archivoRel}: ${err}`);
            continue;
          }
        }
        archivos.push(archivoRel);
      }
      if (archivos.length >= 2) {
        itemsMulti.push({
          archivos,
          hospedero: especie.slug,
          fuente: g.fuente,
          lat: g.lat,
          lng: g.lng,
        });
      }
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(items, null, 2));
  console.log(`Manifest escrito: ${items.length} fotos → ${MANIFEST_PATH}`);

  const manifestMulti: ManifestMulti = { generadoEl: new Date().toISOString(), items: itemsMulti };
  fs.writeFileSync(MANIFEST_MULTI_PATH, JSON.stringify(manifestMulti, null, 2));
  console.log(`Manifiesto múltiple: ${itemsMulti.length} observaciones con ≥2 fotos → ${MANIFEST_MULTI_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
