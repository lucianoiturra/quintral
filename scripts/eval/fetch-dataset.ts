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
import { urlsDeFotos, type INatObservation } from "./inaturalist";
import type { ManifestItem } from "@/lib/evalTypes";
import type { Host } from "@/lib/types";

const ESPECIES: { slug: Host; taxonId: number }[] = [
  { slug: "quillay", taxonId: 82621 },
  { slug: "litre", taxonId: 82622 },
  { slug: "peumo", taxonId: 82623 },
  { slug: "boldo", taxonId: 77958 },
  { slug: "maqui", taxonId: 62891 },
];

const MAX_POR_ESPECIE = 20;
const OUT_DIR = path.resolve("data/eval/fotos");
const MANIFEST_PATH = path.resolve("data/eval/manifest.json");

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
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(items, null, 2));
  console.log(`Manifest escrito: ${items.length} fotos → ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
