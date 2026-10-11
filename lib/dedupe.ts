const NAME_SUFFIXES = [
  "incorporated",
  "inc",
  "pvt ltd",
  "pvt",
  "ltd",
  "llc",
  "llp",
  "limited",
  "technologies",
  "technology",
  "labs",
  "co",
  "corp",
  "corporation",
];

/** Lowercase, strip protocol/www/path, so different URLs to the same site collapse together. */
export function normalizeDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  let host: string;
  try {
    const withProtocol = website.match(/^https?:\/\//) ? website : `https://${website}`;
    host = new URL(withProtocol).hostname;
  } catch {
    return null;
  }
  return host.toLowerCase().replace(/^www\./, "") || null;
}

/** Lowercase, strip punctuation and common legal-entity suffixes, collapse whitespace. */
export function normalizeName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/[.,'"()]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const suffix of NAME_SUFFIXES) {
    const re = new RegExp(`\\b${suffix}\\b\\.?$`, "i");
    normalized = normalized.replace(re, "").trim();
  }

  return normalized.replace(/\s+/g, " ").trim();
}

/** Domain when known, otherwise the normalised name — the uniqueness key for `startups`. */
export function dedupeKeyFor(name: string, website: string | null | undefined): string {
  const domain = normalizeDomain(website);
  return domain || `name:${normalizeName(name)}`;
}
