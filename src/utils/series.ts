// Serien: Ein Werk kann aus mehreren Teilen bestehen (z. B. "Albtraum" aus 8 Arbeiten).
// Im Admin traegt ein Teil im Feld "Serie" den Slug des Hauptwerks ein (Auswahlliste).
//
// Regeln:
//  - Ein Teil erscheint NICHT in der Werke-Uebersicht, nur auf der Seite des Hauptwerks.
//  - Titel eines Teils: immer "Werk 1", "Werk 2" ... (Position nach Datum/Uhrzeit), egal wie der Teil im Admin heisst.
//  - Reihenfolge der Teile: nach Datum/Uhrzeit (Feld "date"), danach nach Slug.
//  - Jahr und Material werden vom Hauptwerk uebernommen, wenn beim Teil leer. Maße nie.

export type Fm = Record<string, any>;

const clean = (value: unknown): string => String(value ?? "").trim();

/** Slug des Hauptwerks, zu dem dieses Werk gehoert ("" = gehoert zu keiner Serie). */
export function parentSlugOf(fm: Fm): string {
  return clean(fm?.series);
}

/** Alle Slugs, die es als Werk gibt. */
export function slugSet(all: Fm[]): Set<string> {
  return new Set(all.map((fm) => clean(fm?.slug)).filter(Boolean));
}

/** Ist dieses Werk ein Serienteil eines (existierenden) Hauptwerks? */
export function isPart(fm: Fm, slugs: Set<string>): boolean {
  const parent = parentSlugOf(fm);
  return parent !== "" && parent !== clean(fm?.slug) && slugs.has(parent);
}

function time(value: unknown): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const t = new Date(value as any).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** Alle Teile eines Hauptwerks in der richtigen Reihenfolge. */
export function seriesParts(all: Fm[], parentSlug: string): Fm[] {
  return all
    .filter((fm) => parentSlugOf(fm) === parentSlug && clean(fm.slug) !== parentSlug)
    .sort((a, b) => {
      const d = time(a.date) - time(b.date);
      if (d !== 0 && Number.isFinite(d)) return d;
      return clean(a.slug).localeCompare(clean(b.slug), "de", { numeric: true });
    });
}

/** Anzeigename eines Teils: "Werk 1", "Werk 2" ... (en: "Work 1"); index = Position in seriesParts() (0-basiert). */
export function partLabel(_parent: Fm, _part: Fm, index: number, lang = "de"): string {
  return `${lang === "en" ? "Work" : "Werk"} ${index + 1}`;
}
