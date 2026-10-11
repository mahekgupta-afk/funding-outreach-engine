/**
 * Source registry: every feed the ingestion pipeline pulls from. Add a new
 * feed here (not scattered through the pipeline code) to pull from it.
 */

export type SourceKind = "rss" | "hn-algolia";

export interface SourceDef {
  id: string;
  kind: SourceKind;
  url: string;
}

function googleNewsSearch(query: string, country: "IN" | "US"): string {
  const params =
    country === "IN" ? "hl=en-IN&gl=IN&ceid=IN:en" : "hl=en-US&gl=US&ceid=US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${params}`;
}

export const SOURCES: SourceDef[] = [
  { id: "techcrunch-venture", kind: "rss", url: "https://techcrunch.com/category/venture/feed/" },
  { id: "techcrunch-startups", kind: "rss", url: "https://techcrunch.com/tag/startups/feed/" },
  { id: "inc42-funding", kind: "rss", url: "https://inc42.com/tag/funding/feed/" },
  { id: "entrackr", kind: "rss", url: "https://entrackr.com/rss" },
  { id: "yourstory-funding", kind: "rss", url: "https://yourstory.com/category/funding/feed" },
  { id: "google-news-seed-round-in", kind: "rss", url: googleNewsSearch('"seed round"', "IN") },
  { id: "google-news-seed-round-us", kind: "rss", url: googleNewsSearch('"seed round"', "US") },
  { id: "google-news-pre-seed-in", kind: "rss", url: googleNewsSearch('"pre-seed"', "IN") },
  { id: "google-news-pre-seed-us", kind: "rss", url: googleNewsSearch('"pre-seed"', "US") },
  {
    id: "google-news-raises-seed-funding",
    kind: "rss",
    url: googleNewsSearch('"raises seed funding"', "IN"),
  },
  {
    id: "google-news-raises-pre-seed",
    kind: "rss",
    url: googleNewsSearch('"raises pre-seed"', "IN"),
  },
  {
    id: "hn-seed-funding",
    kind: "hn-algolia",
    url: "https://hn.algolia.com/api/v1/search_by_date?query=seed%20funding&tags=story",
  },
];
