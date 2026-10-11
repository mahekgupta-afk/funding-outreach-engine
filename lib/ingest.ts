import Parser from "rss-parser";
import { SOURCES, type SourceDef } from "./sources";

export interface RawArticle {
  title: string;
  url: string;
  source: string;
  published_at: string | null; // ISO 8601, or null if the feed didn't supply one
  snippet: string;
}

export interface SourceError {
  source: string;
  message: string;
}

export interface IngestResult {
  articles: RawArticle[];
  errors: SourceError[];
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; FundingOutreachEngine/1.0; +https://github.com)";

const rssParser = new Parser({
  timeout: 15_000,
  headers: { "User-Agent": USER_AGENT },
});

async function fetchRss(source: SourceDef): Promise<RawArticle[]> {
  const feed = await rssParser.parseURL(source.url);
  return feed.items
    .filter((item): item is typeof item & { link: string } => Boolean(item.link))
    .map((item) => ({
      title: item.title?.trim() || "(untitled)",
      url: item.link,
      source: source.id,
      published_at: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : null),
      snippet: (item.contentSnippet || item.summary || "").slice(0, 1000),
    }));
}

interface HnHit {
  objectID: string;
  title: string | null;
  url: string | null;
  story_text: string | null;
  created_at: string;
}

async function fetchHnAlgolia(source: SourceDef): Promise<RawArticle[]> {
  const res = await fetch(source.url, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`HN Algolia responded ${res.status}`);

  const json: { hits: HnHit[] } = await res.json();
  return json.hits
    .filter((hit) => Boolean(hit.url || hit.title))
    .map((hit) => ({
      title: hit.title?.trim() || "(untitled)",
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source: source.id,
      published_at: hit.created_at,
      snippet: (hit.story_text || "").slice(0, 1000),
    }));
}

/**
 * Fetches every registered source in parallel. A failing source never fails
 * the run — its error is captured and the rest of the sources still return
 * their articles.
 */
export async function ingestAll(): Promise<IngestResult> {
  const articles: RawArticle[] = [];
  const errors: SourceError[] = [];

  await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const items = source.kind === "rss" ? await fetchRss(source) : await fetchHnAlgolia(source);
        articles.push(...items);
      } catch (err) {
        errors.push({
          source: source.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  return { articles, errors };
}

/** Keeps only articles published within the last `hours`, dropping anything with no date. */
export function filterFresh(articles: RawArticle[], hours: number): RawArticle[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return articles.filter((a) => {
    if (!a.published_at) return false;
    const t = Date.parse(a.published_at);
    return !Number.isNaN(t) && t >= cutoff;
  });
}

/** Dedupes articles by URL first, then by normalised (lowercased, whitespace-collapsed) title. */
export function dedupeArticles(articles: RawArticle[]): RawArticle[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: RawArticle[] = [];

  for (const article of articles) {
    if (seenUrls.has(article.url)) continue;

    const normalizedTitle = article.title.toLowerCase().trim().replace(/\s+/g, " ");
    if (normalizedTitle && seenTitles.has(normalizedTitle)) continue;

    seenUrls.add(article.url);
    if (normalizedTitle) seenTitles.add(normalizedTitle);
    result.push(article);
  }

  return result;
}
