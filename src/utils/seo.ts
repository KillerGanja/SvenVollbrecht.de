export const SITE_URL = "https://svenvollbrecht.de";
export const SITE_NAME = "Sven Vollbrecht";

// Standard-Vorschaubild (Startseitenbild), wenn eine Seite kein eigenes Bild hat.
// Muss ein echtes Bild (jpg/png/webp) sein; SVG und Video funktionieren bei Social-Media-Vorschauen nicht.
export const DEFAULT_OG_IMAGE = "/uploads/02a.jpg";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

export const defaultDescription: Record<string, string> = {
  de: "Sven Vollbrecht (geboren in West-Berlin) ist ein deutscher Konzeptkünstler. Er arbeitet mit Installationen, Videoarbeiten und partizipativen Formaten.",
  en: "Sven Vollbrecht (born in West Berlin) is a German conceptual artist working with installation, video and participatory formats.",
};

export const homeTitle: Record<string, string> = {
  de: "Sven Vollbrecht | Konzeptkünstler & Zeitgenössische Kunst Berlin",
  en: "Sven Vollbrecht | Conceptual Artist & Contemporary Art, Berlin",
};

// Beschreibungen für Seiten ohne eigenen Fließtext
export const pageDescription: Record<string, Record<string, string>> = {
  works: {
    de: "Arbeiten von Sven Vollbrecht: Installationen, Videoarbeiten und partizipative Kunst des Berliner Konzeptkünstlers im Überblick.",
    en: "Works by Sven Vollbrecht: installations, video works and participatory art by the Berlin-based conceptual artist.",
  },
  exhibitions: {
    de: "Ausstellungen von Sven Vollbrecht: Einzel- und Gruppenausstellungen des Berliner Konzeptkünstlers.",
    en: "Exhibitions by Sven Vollbrecht: solo and group shows by the Berlin-based conceptual artist.",
  },
  press: {
    de: "Presse über Sven Vollbrecht: Berichte, Interviews und Rezensionen zu Ausstellungen und Arbeiten des Berliner Konzeptkünstlers.",
    en: "Press on Sven Vollbrecht: reports, interviews and reviews on exhibitions and works by the Berlin-based conceptual artist.",
  },
  contact: {
    de: "Kontakt zu Sven Vollbrecht, Konzeptkünstler in Berlin: Anfragen zu Ausstellungen, Projekten und Presse.",
    en: "Contact Sven Vollbrecht, conceptual artist in Berlin: enquiries about exhibitions, projects and press.",
  },
  impressum: {
    de: "Impressum und Anbieterkennzeichnung der Website von Sven Vollbrecht.",
    en: "Legal notice of the website of Sven Vollbrecht.",
  },
  privacy: {
    de: "Datenschutzerklärung der Website von Sven Vollbrecht.",
    en: "Privacy policy of the website of Sven Vollbrecht.",
  },
};

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Nimmt das erste Bild aus der Liste (Cover, dann Galerie). Videos und leere Werte werden übersprungen.
export function pickImage(...candidates: any[]): string {
  const flat = candidates.flatMap((c) => (Array.isArray(c) ? c : [c]));
  for (const c of flat) {
    const value = typeof c === "string" ? c : c?.image;
    if (typeof value === "string" && IMAGE_EXT.test(value.split("?")[0])) {
      return value;
    }
  }
  return DEFAULT_OG_IMAGE;
}

// Markdown -> kurzer Klartext, an Wortgrenze gekürzt (für meta description)
export function excerpt(markdown: string | undefined | null, max = 155): string {
  if (!markdown) return "";
  const plain = String(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : cut.length).replace(/[\s,;:.\-–]+$/, "")}…`;
}
