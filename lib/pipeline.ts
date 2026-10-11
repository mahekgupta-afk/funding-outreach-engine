import { getSupabaseAdmin } from "./supabase";
import { ingestAll, filterFresh, dedupeArticles, type RawArticle } from "./ingest";
import { extractAll, filterSeedStage, type Extraction } from "./extract";
import { researchWebsite } from "./research";
import { scoreFit } from "./fit-score";
import { draftEmail } from "./draft";
import { dedupeKeyFor, normalizeDomain } from "./dedupe";
import type { Thesis } from "./thesis";

export interface RunSummary {
  run_id: string;
  articles_fetched: number;
  articles_new: number;
  funding_found: number;
  seed_stage: number;
  drafts_created: number;
  rejected: number;
  errors: string[];
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// Leaves a safety margin under Vercel's maxDuration (300s on Hobby): if a run
// is running long (large backlog, slow Gemini responses), it stops picking up
// new work and exits cleanly rather than risking a hard kill mid-write. Any
// article not yet marked "seen" at that point is naturally retried next run.
const TIME_BUDGET_MS = 260_000;

export async function runPipeline(): Promise<RunSummary> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  const startedAt = Date.now();
  const outOfTime = () => Date.now() - startedAt > TIME_BUDGET_MS;

  const { data: runRow, error: runInsertError } = await supabase
    .from("runs")
    .insert({})
    .select()
    .single();
  if (runInsertError || !runRow) {
    throw new Error(`Failed to create run row: ${runInsertError?.message}`);
  }
  const runId: string = runRow.id;

  const summary: RunSummary = {
    run_id: runId,
    articles_fetched: 0,
    articles_new: 0,
    funding_found: 0,
    seed_stage: 0,
    drafts_created: 0,
    rejected: 0,
    errors,
  };

  try {
    // 1. Load the active thesis fresh — never cached across runs.
    const { data: thesisRow, error: thesisError } = await supabase
      .from("thesis")
      .select("*")
      .eq("is_active", true)
      .single();
    if (thesisError || !thesisRow) {
      throw new Error(`No active thesis found: ${thesisError?.message}`);
    }
    const thesis = thesisRow as Thesis;

    // 2. Ingest every source in parallel; a failing source is logged, not fatal.
    const { articles, errors: sourceErrors } = await ingestAll();
    errors.push(...sourceErrors.map((e) => `source ${e.source}: ${e.message}`));
    summary.articles_fetched = articles.length;

    // 3. Keep only articles from the lookback window, deduped by URL/title.
    const lookbackHours = envInt("LOOKBACK_HOURS", 24);
    const fresh = dedupeArticles(filterFresh(articles, lookbackHours));

    // 4. Drop anything already in seen_articles (read-only check — nothing is
    // marked seen yet). Only articles that reach a definitive outcome below
    // get recorded, so a capped-out or time-budgeted article is retried next run.
    const newArticles = await findNewArticles(supabase, fresh);
    summary.articles_new = newArticles.length;

    const maxArticles = envInt("MAX_ARTICLES_PER_RUN", 40);
    const toProcess = newArticles.slice(0, maxArticles);

    // 5-7. Classify, extract, and keep only pre-seed/seed funding announcements.
    const { extracted, errors: extractErrors } = await extractAll(toProcess);
    errors.push(...extractErrors);
    summary.funding_found = extracted.filter((e) => e.extraction.is_funding_announcement).length;

    // Articles whose batch failed outright never reach `extracted` at all —
    // they're simply never marked seen below, so they're retried next run.
    const { kept, dropped } = filterSeedStage(extracted);
    summary.seed_stage = kept.length;

    for (const d of dropped) {
      await logRejected(supabase, {
        extraction: d.item.extraction,
        source_url: d.item.article.url,
        fit_score: null,
        reject_reason: d.reason,
        detail: d.item.extraction.one_line_description,
      });
      summary.rejected++;
      await markSeen(supabase, d.item.article);
    }

    // 8. Dedupe by domain/name before spending research + Gemini quota on a repeat.
    const existingKeys = await loadExistingDedupeKeys(supabase);
    const seenThisRun = new Set<string>();
    let deferredForTime = 0;

    for (const item of kept) {
      if (outOfTime()) {
        deferredForTime++;
        continue; // left unmarked in seen_articles — retried next run
      }

      const key = dedupeKeyFor(item.extraction.startup_name, item.extraction.website);
      if (existingKeys.has(key) || seenThisRun.has(key)) {
        // Already tracked via another article — this URL need never be looked at again.
        await markSeen(supabase, item.article);
        continue;
      }
      seenThisRun.add(key);

      try {
        // 9. Research the startup's website (falls back to article snippet on failure).
        const research = await researchWebsite(item.extraction.website);
        const websiteText = research.quality === "ok" ? research.text : item.article.snippet;

        // 10. Score fit against the thesis.
        const fit = await scoreFit(thesis, item.extraction, websiteText);

        // 11. Fit gate.
        if (fit.score < thesis.fit_threshold) {
          await logRejected(supabase, {
            extraction: item.extraction,
            source_url: item.article.url,
            dedupe_key: key,
            fit_score: fit.score,
            reject_reason: "below_threshold",
            detail: fit.reason,
          });
          summary.rejected++;
          await markSeen(supabase, item.article);
          continue;
        }

        // 12. Draft the outreach email.
        const draft = await draftEmail(thesis, item.extraction, fit, websiteText);

        // 13. Atomically insert startup + draft (no-op if dedupe_key already exists).
        const { data: startupId, error: rpcError } = await supabase.rpc(
          "insert_startup_and_draft",
          {
            p_dedupe_key: key,
            p_name: item.extraction.startup_name,
            p_website: item.extraction.website,
            p_domain: normalizeDomain(item.extraction.website),
            p_stage: item.extraction.stage,
            p_amount_usd: item.extraction.amount_usd,
            p_currency_raw: item.extraction.amount_raw,
            p_investors: item.extraction.investors,
            p_founders: item.extraction.founders,
            p_sector: item.extraction.sector,
            p_geography: item.extraction.geography,
            p_announced_at: item.extraction.announced_at,
            p_source_url: item.article.url,
            p_fit_score: fit.score,
            p_fit_reason: fit.reason,
            p_to_name: item.extraction.founders[0] ?? null,
            p_to_email: null,
            p_subject: draft.subject,
            p_body: draft.body,
            p_research_quality: research.quality,
          }
        );

        if (rpcError) {
          errors.push(`insert_startup_and_draft(${key}): ${rpcError.message}`);
          continue; // left unmarked — retried next run rather than lost
        }
        if (startupId) summary.drafts_created++;
        await markSeen(supabase, item.article);
      } catch (err) {
        errors.push(
          `processing ${item.extraction.startup_name}: ${err instanceof Error ? err.message : String(err)}`
        );
        // left unmarked in seen_articles — retried next run rather than lost
      }
    }

    if (deferredForTime > 0) {
      errors.push(
        `Stopped early at the time budget with ${deferredForTime} extracted item(s) still unprocessed — they'll be retried next run.`
      );
    }

    // Articles outside MAX_ARTICLES_PER_RUN were never in `toProcess` at all,
    // so they too were never marked seen — naturally retried next run (as
    // long as they're still within LOOKBACK_HOURS then).
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  await supabase
    .from("runs")
    .update({
      finished_at: new Date().toISOString(),
      articles_fetched: summary.articles_fetched,
      articles_new: summary.articles_new,
      funding_found: summary.funding_found,
      seed_stage: summary.seed_stage,
      drafts_created: summary.drafts_created,
      rejected: summary.rejected,
      errors: summary.errors,
    })
    .eq("id", runId);

  return summary;
}

async function findNewArticles(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  articles: RawArticle[]
): Promise<RawArticle[]> {
  if (articles.length === 0) return [];

  const urls = articles.map((a) => a.url);
  const { data: existing } = await supabase.from("seen_articles").select("url").in("url", urls);
  const existingUrls = new Set((existing ?? []).map((r) => r.url as string));

  return articles.filter((a) => !existingUrls.has(a.url));
}

async function markSeen(supabase: ReturnType<typeof getSupabaseAdmin>, article: RawArticle) {
  await supabase.from("seen_articles").upsert(
    {
      url: article.url,
      source: article.source,
      title: article.title,
      published_at: article.published_at,
    },
    { onConflict: "url", ignoreDuplicates: true }
  );
}

async function loadExistingDedupeKeys(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Set<string>> {
  const { data } = await supabase
    .from("startups")
    .select("dedupe_key")
    .in("status", ["queued", "contacted", "rejected"]);
  return new Set((data ?? []).map((r) => r.dedupe_key as string));
}

async function logRejected(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: {
    extraction: Extraction;
    source_url: string;
    fit_score: number | null;
    reject_reason: string;
    detail: string;
    dedupe_key?: string | null;
  }
) {
  const { extraction, source_url, fit_score, reject_reason, detail, dedupe_key } = row;
  await supabase.from("rejected_log").insert({
    dedupe_key: dedupe_key ?? null,
    name: extraction.startup_name,
    stage: extraction.stage,
    fit_score,
    reject_reason,
    detail,
    source_url,
    website: extraction.website,
    domain: normalizeDomain(extraction.website),
    amount_usd: extraction.amount_usd,
    currency_raw: extraction.amount_raw,
    investors: extraction.investors,
    founders: extraction.founders,
    sector: extraction.sector,
    geography: extraction.geography,
    announced_at: extraction.announced_at,
  });
}
