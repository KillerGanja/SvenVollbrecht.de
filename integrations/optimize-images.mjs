// Astro-Integration: erzeugt nach dem Build aus den Original-Uploads
// optimierte Bildvarianten in dist/uploads/_opt/ (siehe src/utils/image-variants.mjs).
//
// - Die Originale in public/uploads werden NIE veraendert.
// - Ein Cache (node_modules/.cache/sv-images) merkt sich fertige Varianten anhand des
//   Datei-Inhalts. Dadurch wird nur neu gerechnet, was neu oder veraendert ist.
// - Eine kaputte Bilddatei laesst den Build nicht scheitern: dann wird das Original
//   unter den Variantennamen bereitgestellt (gross, aber die Seite bleibt heil).
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  OPT_DIR_NAME,
  RASTER,
  FALLBACK_MAX_WIDTH,
  widthsFor,
  readDimensions,
  variantFileName,
  fallbackFileName,
} from "../src/utils/image-variants.mjs";

const WEBP_QUALITY = 78;
const JPEG_QUALITY = 80;

async function listImages(dir, rel = "") {
  let out = [];
  let entries = [];
  try {
    entries = await fs.readdir(path.join(dir, rel), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name === OPT_DIR_NAME) continue;
      out = out.concat(await listImages(dir, r));
    } else if (e.isFile() && RASTER.test(e.name)) {
      out.push(r);
    }
  }
  return out;
}

function sha1File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha1");
    fssync
      .createReadStream(file)
      .on("data", (c) => h.update(c))
      .on("end", () => resolve(h.digest("hex").slice(0, 16)))
      .on("error", reject);
  });
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function encode(file, outFile, kind, width) {
  const tmp = `${outFile}.tmp`;
  let pipe = sharp(file, { failOn: "none" }).rotate(); // EXIF-Drehung anwenden
  pipe = pipe.resize({ width, withoutEnlargement: true });
  if (kind === "webp") pipe = pipe.webp({ quality: WEBP_QUALITY, effort: 4 });
  else if (kind === "png") pipe = pipe.png({ compressionLevel: 9, effort: 7 });
  else pipe = pipe.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  await pipe.toFile(tmp);
  await fs.rename(tmp, outFile);
}

/**
 * @param {{uploadsDir:string, outDir:string, cacheDir:string, log?:{info:Function,warn:Function}}} o
 */
export async function optimizeUploads({ uploadsDir, outDir, cacheDir, log = console }) {
  const t0 = Date.now();
  const optDir = path.join(outDir, OPT_DIR_NAME);
  await fs.mkdir(optDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  const files = await listImages(uploadsDir);
  const used = new Set();
  const stats = { images: files.length, encoded: 0, cached: 0, failed: 0 };
  sharp.cache(false);

  const processOne = async (rel) => {
    const abs = path.join(uploadsDir, rel);
    const outputs = [];
    try {
      const key = await sha1File(abs);
      const { width } = await readDimensions(abs);
      if (!width) throw new Error("Breite nicht lesbar");
      for (const w of widthsFor(width)) {
        outputs.push({ name: variantFileName(rel, w), kind: "webp", width: w, tag: `${w}.webp` });
      }
      const isPng = /\.png$/i.test(rel);
      outputs.push({
        name: fallbackFileName(rel),
        kind: isPng ? "png" : "jpg",
        width: Math.min(width, FALLBACK_MAX_WIDTH),
        tag: isPng ? "fb.png" : "fb.jpg",
      });
      for (const o of outputs) {
        const cacheFile = path.join(cacheDir, `${key}-${o.tag}`);
        used.add(path.basename(cacheFile));
        if (await exists(cacheFile)) stats.cached++;
        else {
          await encode(abs, cacheFile, o.kind, o.width);
          stats.encoded++;
        }
        await fs.copyFile(cacheFile, path.join(optDir, o.name));
      }
    } catch (err) {
      stats.failed++;
      log.warn?.(`Bild nicht optimierbar, Original wird verwendet: ${rel} (${err.message})`);
      // Ersatz: Originaldatei unter allen erwarteten Namen bereitstellen, damit keine Links ins Leere laufen.
      const names = outputs.length
        ? outputs.map((o) => o.name)
        : [variantFileName(rel, 480), variantFileName(rel, 960), variantFileName(rel, 1600), variantFileName(rel, 2400), fallbackFileName(rel)];
      for (const n of names) await fs.copyFile(abs, path.join(optDir, n)).catch(() => {});
    }
  };

  const queue = [...files];
  const workers = Math.max(1, Math.min(4, os.cpus().length - 1 || 1));
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (queue.length) await processOne(queue.shift());
    }),
  );

  // Nicht mehr benoetigte Cache-Dateien aufraeumen (geloeschte/ersetzte Bilder)
  for (const f of await fs.readdir(cacheDir)) {
    if (!used.has(f) && !f.endsWith(".tmp")) await fs.rm(path.join(cacheDir, f), { force: true });
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  log.info?.(
    `Bilder: ${stats.images} Originale, ${stats.encoded} neu erzeugt, ${stats.cached} aus dem Cache, ${stats.failed} Fehler (${secs}s)`,
  );
  return stats;
}

export default function optimizeImages() {
  return {
    name: "sv-optimize-images",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = process.cwd();
        await optimizeUploads({
          uploadsDir: path.join(root, "public", "uploads"),
          outDir: path.join(fileURLToPath(dir), "uploads"),
          cacheDir: path.join(root, "node_modules", ".cache", "sv-images"),
          log: logger,
        });
      },
    },
  };
}
