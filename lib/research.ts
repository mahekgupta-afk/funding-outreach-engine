import { convert } from "html-to-text";

const USER_AGENT =
  "Mozilla/5.0 (compatible; FundingOutreachEngine/1.0; +https://github.com)";
const MAX_CHARS = 4000;
const FETCH_TIMEOUT_MS = 10_000;

export interface ResearchResult {
  text: string;
  quality: "ok" | "low";
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return convert(html, {
      wordwrap: false,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
      ],
    });
  } catch {
    return null;
  }
}

function normalizeWebsiteUrl(website: string): string {
  return website.match(/^https?:\/\//) ? website : `https://${website}`;
}

/**
 * Fetches a startup's website (and /about, if the homepage was reachable) and
 * returns combined plain text, trimmed to ~4k chars. Falls back to
 * quality "low" (empty text) if the site can't be reached at all — the
 * caller should fall back to the article snippet in that case.
 */
export async function researchWebsite(website: string | null): Promise<ResearchResult> {
  if (!website) return { text: "", quality: "low" };

  const base = normalizeWebsiteUrl(website);
  const homeText = await fetchPageText(base);

  if (homeText === null) {
    return { text: "", quality: "low" };
  }

  let combined = homeText;
  if (combined.length < MAX_CHARS) {
    const aboutUrl = new URL("/about", base).toString();
    const aboutText = await fetchPageText(aboutUrl);
    if (aboutText) combined += "\n\n--- /about ---\n\n" + aboutText;
  }

  return { text: combined.slice(0, MAX_CHARS), quality: "ok" };
}
