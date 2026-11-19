// Gemeinsame Regeln fuer automatisch erzeugte Bildvarianten.
// Wird vom Build (integrations/optimize-images.mjs) UND von den Seiten-Komponenten benutzt,
// damit beide immer dieselben Dateinamen und Groessen meinen.
//
// Idee: Der Kuenstler laedt Originale nach /uploads/ hoch (beliebig gross).
// Beim Build entstehen daraus unter /uploads/_opt/ kleine WebP-Varianten
// (480/960/1600/2400 px breit) plus ein JPEG/PNG-Fallback (max. 1600 px).
// Die Seiten liefern nur noch diese Varianten aus. Die Originale bleiben unveraendert.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const UPLOAD_PREFIX = "/uploads/";
export const OPT_DIR_NAME = "_opt";
export const OPT_PREFIX = `${UPLOAD_PREFIX}${OPT_DIR_NAME}/`;
export const WIDTHS = [480, 960, 1600, 2400];
export const FALLBACK_MAX_WIDTH = 1600;
export const RASTER = /\.(jpe?g|png)$/i;

/** Ordner mit den Original-Uploads (der Build laeuft im Projektstamm). */
export function uploadsDir() {
  return path.join(process.cwd(), "public", "uploads");
}

/** Ist das ein Pfad wie /uploads/foo.jpg, den wir optimieren koennen? */
export function isOptimizable(src) {
  if (typeof src !== "string") return false;
  const clean = src.split("?")[0];
  return (
    clean.startsWith(UPLOAD_PREFIX) &&
    !clean.startsWith(OPT_PREFIX) &&
    RASTER.test(clean)
  );
}

/** "/uploads/a%20b.jpg" -> "a b.jpg" (Pfad relativ zu uploads/) */
export function relativeFile(src) {
  const clean = src.split("?")[0].slice(UPLOAD_PREFIX.length);
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
}

/** Dateiname ohne Unterordner, eindeutig: "unter/ordner/foo.jpg" -> "unter__ordner__foo.jpg" */
export function flatName(file) {
  return file.replace(/[\\/]+/g, "__");
}

export function variantFileName(file, width) {
  return `${flatName(file)}-${width}.webp`;
}

export function fallbackFileName(file) {
  const ext = /\.png$/i.test(file) ? "png" : "jpg";
  return `${flatName(file)}-fallback.${ext}`;
}

const toUrl = (name) => OPT_PREFIX + encodeURIComponent(name);

export function variantUrl(src, width) {
  return toUrl(variantFileName(relativeFile(src), width));
}

export function fallbackUrl(src) {
  return toUrl(fallbackFileName(relativeFile(src)));
}

/** Welche Breiten werden fuer ein Original der Breite origWidth erzeugt? (nie hochskalieren) */
export function widthsFor(origWidth) {
  const max = Math.min(origWidth, WIDTHS[WIDTHS.length - 1]);
  const list = WIDTHS.filter((w) => w < max);
  list.push(max);
  return list;
}

/** Breite/Hoehe nach Beruecksichtigung der EXIF-Drehung (Handyfotos!). */
export async function readDimensions(absFile) {
  const meta = await sharp(absFile, { failOn: "none" }).metadata();
  let width = meta.width || 0;
  let height = meta.height || 0;
  if (meta.orientation && meta.orientation >= 5) [width, height] = [height, width];
  return { width, height };
}

const infoCache = new Map();

/**
 * Liefert {width,height} des Originals oder null, wenn die Datei fehlt/nicht lesbar ist.
 * Ergebnis wird pro Build zwischengespeichert.
 */
export async function getImageInfo(src) {
  if (!isOptimizable(src)) return null;
  if (infoCache.has(src)) return infoCache.get(src);
  let info = null;
  try {
    const abs = path.join(uploadsDir(), relativeFile(src));
    if (fs.existsSync(abs)) {
      const d = await readDimensions(abs);
      if (d.width > 0 && d.height > 0) info = d;
    }
  } catch {
    info = null;
  }
  infoCache.set(src, info);
  return info;
}

/** Fuer Social-Media-Vorschau (og:image): das JPEG/PNG-Fallback, falls das Original existiert. */
export function ogImageFor(src) {
  if (!isOptimizable(src)) return src;
  try {
    if (!fs.existsSync(path.join(uploadsDir(), relativeFile(src)))) return src;
  } catch {
    return src;
  }
  return fallbackUrl(src);
}

// ---------------------------------------------------------------------------
// Videos: beim Build wird jedes in den Inhalten verwendete Video (.mov/.mp4/.m4v/.webm)
// in ein web-taugliches MP4 (H.264/AAC, max. 1920 px, "faststart") umgewandelt,
// dazu ein Vorschaubild (Poster). Die Originale bleiben unveraendert.
// ---------------------------------------------------------------------------
export const VIDEO = /\.(mov|mp4|m4v|webm)$/i;

export function isVideo(src) {
  return (
    typeof src === "string" &&
    src.split("?")[0].startsWith(UPLOAD_PREFIX) &&
    VIDEO.test(src.split("?")[0])
  );
}

export function videoFileName(file) {
  return `${flatName(file)}-video.mp4`;
}

export function posterFileName(file) {
  return `${flatName(file)}-poster.jpg`;
}

export function videoUrl(src) {
  return toUrl(videoFileName(relativeFile(src)));
}

export function posterUrl(src) {
  return toUrl(posterFileName(relativeFile(src)));
}

/** Gibt es die hochgeladene Datei wirklich? */
export function uploadExists(src) {
  try {
    return fs.existsSync(path.join(uploadsDir(), relativeFile(src)));
  } catch {
    return false;
  }
}
