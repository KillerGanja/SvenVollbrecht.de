// Links in Markdown-Texten: Verweise auf FREMDE Seiten oeffnen in einem neuen Tab.
// Links auf die eigene Seite (svenvollbrecht.de und Unterdomains), relative Links, Anker (#...),
// mailto: und tel: bleiben unveraendert. Ein im Text schon gesetztes target/rel bleibt erhalten.

const OWN_HOST = /^(?:[a-z0-9-]+\.)?svenvollbrecht\.de$/i;

export function externalLinks(html: string): string {
  return String(html ?? "").replace(/<a\s([^>]*?)>/gi, (tag: string, attrs: string) => {
    const m = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!m) return tag;
    const href = (m[1] ?? m[2] ?? "").trim();
    // nur absolute http(s)-Adressen (auch //host/...) sind fremde Ziele
    if (!/^(?:https?:)?\/\//i.test(href)) return tag;
    let host = "";
    try {
      host = new URL(href, "https://svenvollbrecht.de").hostname;
    } catch {
      return tag;
    }
    if (OWN_HOST.test(host)) return tag;
    let a = attrs.trim();
    if (!/\btarget\s*=/i.test(a)) a += ' target="_blank"';
    if (!/\brel\s*=/i.test(a)) a += ' rel="noopener noreferrer"';
    return `<a ${a}>`;
  });
}
