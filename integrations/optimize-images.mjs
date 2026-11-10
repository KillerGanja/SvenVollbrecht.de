// Astro-Integration: erzeugt nach dem Build aus den Original-Uploads
// optimierte Bildvarianten in dist/uploads/_opt/ (siehe src/utils/image-variants.mjs).
//
// - Die Originale in public/uploads werden NIE veraendert.
// - Ein Cache (node_modules/.cache/sv-images) merkt sich fertige Varianten anhand des
//   Datei-Inhalts. Dadurch wird nur neu gerechnet, was neu oder veraendert ist.
// - Eine kaputte Bilddatei laesst den Build nicht scheitern: dann wird das Original
//   unter den Variantennamen bereitgestellt (gross, aber die Seite bleibt heil).
// - Videos (.mov/.mp4/.m4v/.webm), die in src/content/ verwendet werden, werden mit ffmpeg
//   in ein kleines Web-MP4 + Poster umgewandelt (ebenfalls mit Cache). Fehlt ffmpeg oder
//   scheitert die Umwandlung, wird das Original unter dem MP4-Namen bereitgestellt.
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
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
  videoFileName,
  posterFileName,
} from "../src/utils/image-variants.mjs";

// Video-Cache-Dateien gehoeren dem Video-Teil und werden hier nicht aufgeraeumt.
const VIDEO_CACHE_FILE = /-v\d+-\d+-crf\d+\.(mp4|jpg)$/;
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
    if (!used.has(f) && !f.endsWith(".tmp") && !VIDEO_CACHE_FILE.test(f)) await fs.rm(path.join(cacheDir, f), { force: true });
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  log.info?.(
    `Bilder: ${stats.images} Originale, ${stats.encoded} neu erzeugt, ${stats.cached} aus dem Cache, ${stats.failed} Fehler (${secs}s)`,
  );
  return stats;
}


// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------
const VIDEO_SETTINGS = "v1-1920-crf24"; // bei Aenderung der Einstellungen hochzaehlen -> Cache wird neu gefuellt
const VIDEO_REF = /\/uploads\/[^\s"'<>()\]\[,]+?\.(?:mov|mp4|m4v|webm)/gi;

function run(cmd, args, timeout = 20 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).toString().split("\n").slice(-4).join(" ").trim()));
      else resolve(stdout);
    });
  });
}

async function listTextFiles(dir) {
  let out = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await listTextFiles(full));
    else if (/\.(md|mdx|json|ya?ml|astro)$/i.test(e.name)) out.push(full);
  }
  return out;
}

/** Alle Videos, auf die in den Inhalten verwiesen wird (nur existierende Dateien). */
async function referencedVideos(contentDir, uploadsDir) {
  const found = new Set();
  for (const f of await listTextFiles(contentDir)) {
    const text = await fs.readFile(f, "utf8");
    for (const m of text.matchAll(VIDEO_REF)) {
      let rel = m[0].slice("/uploads/".length);
      try {
        rel = decodeURIComponent(rel);
      } catch {}
      if (await exists(path.join(uploadsDir, rel))) found.add(rel);
    }
  }
  return [...found].sort();
}

async function encodeVideo(src, outMp4, outPoster) {
  const tmp = `${outMp4}.tmp.mp4`;
  const vf =
    "scale='min(1920,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p";
  await run("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error", "-i", src,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-vf", vf,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-profile:v", "high",
    "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    tmp,
  ]);
  // Ist das Ergebnis nicht kleiner als ein schon vorhandenes MP4, bleibt das Original.
  const [inStat, outStat] = [await fs.stat(src), await fs.stat(tmp)];
  if (/\.mp4$/i.test(src) && outStat.size >= inStat.size) {
    await fs.rm(tmp, { force: true });
    await fs.copyFile(src, outMp4);
  } else {
    await fs.rename(tmp, outMp4);
  }
  // Poster: Standbild kurz nach Beginn (bei sehr kurzen Videos vom Anfang)
  const poster = async (ss) =>
    run("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error", "-ss", ss, "-i", outMp4,
      "-frames:v", "1",
      "-vf", "scale='min(1600,iw)':-2",
      "-q:v", "5", outPoster,
    ]);
  try {
    await poster("0.5");
    if (!(await exists(outPoster))) await poster("0");
  } catch {
    await poster("0");
  }
}

export async function optimizeVideos({ uploadsDir, contentDir, outDir, cacheDir, log = console }) {
  const t0 = Date.now();
  const optDir = path.join(outDir, OPT_DIR_NAME);
  await fs.mkdir(optDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  const files = await referencedVideos(contentDir, uploadsDir);
  const stats = { videos: files.length, encoded: 0, cached: 0, failed: 0 };
  if (!files.length) return stats;

  let ffmpegOk = true;
  try {
    await run("ffmpeg", ["-version"], 15000);
  } catch {
    ffmpegOk = false;
    log.warn?.("ffmpeg nicht gefunden: Videos werden unveraendert bereitgestellt (gross!). Installation: sudo apt install ffmpeg");
  }

  // Gleicher Inhalt unter verschiedenen Namen (Duplikate) wird nur einmal umgewandelt.
  const groups = new Map();
  for (const rel of files) {
    const key = await sha1File(path.join(uploadsDir, rel));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rel);
  }

  const used = new Set();
  for (const [key, rels] of groups) {
    const mp4 = path.join(cacheDir, `${key}-${VIDEO_SETTINGS}.mp4`);
    const jpg = path.join(cacheDir, `${key}-${VIDEO_SETTINGS}.jpg`);
    used.add(path.basename(mp4));
    used.add(path.basename(jpg));
    const first = path.join(uploadsDir, rels[0]);
    let ok = ffmpegOk;
    if (ffmpegOk) {
      if ((await exists(mp4)) && (await exists(jpg))) stats.cached++;
      else {
        try {
          log.info?.(`Video wird umgewandelt: ${rels[0]}`);
          await encodeVideo(first, mp4, jpg);
          stats.encoded++;
        } catch (err) {
          ok = false;
          stats.failed++;
          await fs.rm(mp4, { force: true });
          await fs.rm(jpg, { force: true });
          log.warn?.(`Video nicht umwandelbar, Original wird verwendet: ${rels[0]} (${err.message})`);
        }
      }
    }
    for (const rel of rels) {
      const outMp4 = path.join(optDir, videoFileName(rel));
      const outJpg = path.join(optDir, posterFileName(rel));
      if (ok) {
        await fs.copyFile(mp4, outMp4);
        await fs.copyFile(jpg, outJpg).catch(() => {});
      } else {
        await fs.copyFile(path.join(uploadsDir, rel), outMp4);
      }
    }
  }

  // Nicht mehr benoetigte Video-Cache-Dateien aufraeumen (nur Dateien dieser Art)
  for (const f of await fs.readdir(cacheDir)) {
    if (/-v\d+-\d+-crf\d+\.(mp4|jpg)$/.test(f) && !used.has(f)) await fs.rm(path.join(cacheDir, f), { force: true });
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  log.info?.(`Videos: ${stats.videos} verwendet, ${stats.encoded} neu umgewandelt, ${stats.cached} aus dem Cache, ${stats.failed} Fehler (${secs}s)`);
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
        await optimizeVideos({
          uploadsDir: path.join(root, "public", "uploads"),
          contentDir: path.join(root, "src", "content"),
          outDir: path.join(fileURLToPath(dir), "uploads"),
          cacheDir: path.join(root, "node_modules", ".cache", "sv-images"),
          log: logger,
        });
      },
    },
  };
}
