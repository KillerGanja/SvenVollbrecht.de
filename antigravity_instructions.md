# Antigravity SEO & Entity Implementation Tasks

## Kontext
Diese Anweisungen basieren auf einer SEO-Analyse für svenvollbrecht.de. Ziel ist die Optimierung der technischen Struktur und die Stärkung der Google-Knowledge-Graph-Entität.

## Aufgabenliste für Antigravity

1. **Datei-Infrastruktur:**
   - Erstelle eine `robots.txt` im Root. Erlaube alles, aber füge den Sitemap-Link hinzu: `Sitemap: https://svenvollbrecht.de/sitemap.xml`.
   - Implementiere eine Logik (z.B. ein Bash-Skript oder eine Config-Änderung), um die `sitemap.xml` bei neuen Dateien in `/works/` zu aktualisieren.

2. **Internationalisierung (Hreflang):**
   - Scanne alle HTML/Template-Dateien im `<head>`-Bereich.
   - Füge Hreflang-Tags für `de`, `en` und `x-default` ein (siehe SEO-Vorgaben).

3. **URL-Restrukturierung & Redirects:**
   - Identifiziere Verzeichnisse wie `/trust/` oder `/circle/`.
   - Verschiebe diese in den Unterordner `/works/`.
   - Erstelle eine `.htaccess` (oder entsprechende Config) mit `301 Redirects` von den alten auf die neuen Pfade.

4. **Metadaten-Update:**
   - Korrigiere die `index.html`: Setze den Title auf "Sven Vollbrecht | Konzeptkünstler & Zeitgenössische Kunst Berlin".
   - Ändere auf der Startseite das `<h1>`-Tag von ".COMpliance" zu "Sven Vollbrecht – Konzeptkünstler" und markiere ".COMpliance" als `<h2>`.

5. **Bild-Optimierung:**
   - Suche im Verzeichnis `/assets/img/` (oder ähnlich) nach Werksansichten.
   - Benenne Dateien nach dem Schema `sven-vollbrecht-[werkname]-[beschreibung].jpg` um.
   - Aktualisiere die `alt`-Attribute in den HTML-Dateien mit deskriptiven Texten aus der Analyse.

6. **Structured Data (JSON-LD):**
   - Erstelle ein JSON-LD Snippet vom Typ `Person` für die About-Seite.
   - Verknüpfe die `sameAs`-Attribute mit: Wikipedia, Instagram, Artfacts.
   - Erstelle für jedes Projekt in `/works/` ein `VisualArtwork` Schema.

