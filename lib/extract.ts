import { z } from "zod";
import { generateJson } from "./gemini";
import type { RawArticle } from "./ingest";

export const StageEnum = z.enum([
  "pre-seed",
  "seed",
  "series-a",
  "series-b",
  "later",
  "grant",
  "unknown",
]);

const ExtractionSchema = z.object({
  article_index: z.number().int(),
  is_funding_announcement: z.boolean(),
  startup_name: z.string(),
  website: z.string().nullable(),
  stage: StageEnum,
  amount_usd: z.number().nullable(),
  amount_raw: z.string().nullable(),
  investors: z.array(z.string()),
  founders: z.array(z.string()),
  sector: z.string().nullable(),
  geography: z.string().nullable(),
  announced_at: z.string().nullable(),
  one_line_description: z.string(),
});

const BatchExtractionSchema = z.object({ results: z.array(ExtractionSchema) });

export type Extraction = z.infer<typeof ExtractionSchema>;

export interface ExtractedArticle {
  article: RawArticle;
  extraction: Extraction;
}

const SYSTEM_INSTRUCTION = `You classify news articles as funding announcements and extract
structured data from them. Rules:
- Only set is_funding_announcement to true if the article is specifically about a startup
  raising a funding round (seed, pre-seed, Series A/B, or similar). Acquisitions, IPOs,
  layoffs, general opinion pieces, and non-funding news are all false.
- Do not invent fields. Use null for anything not stated or not confidently inferable.
- Convert amounts to an approximate USD number in amount_usd, and always keep the original
  string (e.g. "₹12 crore", "$2M") in amount_raw.
- "stage" must be one of: pre-seed, seed, series-a, series-b, later, grant, unknown.
- Return exactly one result per input article, in the same order, each tagged with its
  article_index matching the input.`;

const BATCH_SIZE = 10;

function buildPrompt(articles: RawArticle[]): string {
  const list = articles
    .map(
      (a, i) =>
        `[${i}] Title: ${a.title}\nURL: ${a.url}\nSnippet: ${a.snippet || "(no snippet)"}`
    )
    .join("\n\n");

  return `Classify and extract structured funding data from each of these ${articles.length} articles.\n\n${list}`;
}

async function extractBatch(articles: RawArticle[]): Promise<ExtractedArticle[]> {
  const { results } = await generateJson({
    schema: BatchExtractionSchema,
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: buildPrompt(articles),
  });

  const out: ExtractedArticle[] = [];
  for (const extraction of results) {
    const article = articles[extraction.article_index];
    if (article) out.push({ article, extraction });
  }
  return out;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classifies and extracts every article, batching up to BATCH_SIZE per Gemini
 * call to stay within free-tier rate limits. A failing batch is logged and
 * skipped rather than failing the whole run.
 */
export async function extractAll(
  articles: RawArticle[]
): Promise<{ extracted: ExtractedArticle[]; errors: string[] }> {
  const extracted: ExtractedArticle[] = [];
  const errors: string[] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    try {
      extracted.push(...(await extractBatch(batch)));
    } catch (err) {
      errors.push(
        `extract batch [${i}-${i + batch.length}]: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (i + BATCH_SIZE < articles.length) await sleep(300);
  }

  return { extracted, errors };
}

/** Keeps only confirmed funding announcements at pre-seed/seed stage. */
export function filterSeedStage(items: ExtractedArticle[]): {
  kept: ExtractedArticle[];
  dropped: { item: ExtractedArticle; reason: string }[];
} {
  const kept: ExtractedArticle[] = [];
  const dropped: { item: ExtractedArticle; reason: string }[] = [];

  for (const item of items) {
    if (!item.extraction.is_funding_announcement) {
      dropped.push({ item, reason: "not_funding" });
      continue;
    }
    if (item.extraction.stage !== "pre-seed" && item.extraction.stage !== "seed") {
      dropped.push({ item, reason: "not_seed" });
      continue;
    }
    kept.push(item);
  }

  return { kept, dropped };
}
