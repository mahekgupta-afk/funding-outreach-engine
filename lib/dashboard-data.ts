import { getSupabaseAdmin } from "./supabase";
import type { Thesis } from "./thesis";

export interface StartupRow {
  id: string;
  dedupe_key: string;
  name: string;
  website: string | null;
  domain: string | null;
  stage: string | null;
  amount_usd: number | null;
  currency_raw: string | null;
  investors: string[];
  founders: string[];
  sector: string | null;
  geography: string | null;
  announced_at: string | null;
  source_url: string | null;
  fit_score: number | null;
  fit_reason: string | null;
  status: string;
  created_at: string;
}

export interface DraftRow {
  id: string;
  startup_id: string;
  to_name: string | null;
  to_email: string | null;
  subject: string;
  body: string;
  status: string;
  research_quality: string | null;
  created_at: string;
  reviewed_at: string | null;
  startups: StartupRow;
}

export interface RejectedRow {
  id: string;
  dedupe_key: string | null;
  name: string | null;
  stage: string | null;
  fit_score: number | null;
  reject_reason: string;
  detail: string | null;
  source_url: string | null;
  created_at: string;
  website: string | null;
  domain: string | null;
  amount_usd: number | null;
  currency_raw: string | null;
  investors: string[];
  founders: string[];
  sector: string | null;
  geography: string | null;
  announced_at: string | null;
  promoted_at: string | null;
  promoted_startup_id: string | null;
}

export interface RunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  articles_fetched: number;
  articles_new: number;
  funding_found: number;
  seed_stage: number;
  drafts_created: number;
  rejected: number;
  errors: unknown;
}

export async function getPendingDrafts(): Promise<DraftRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("drafts")
    .select("*, startups(*)")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as DraftRow[];
}

/** Every draft regardless of status — the Email page filters client-side by status tab. */
export async function getAllDrafts(): Promise<DraftRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("drafts")
    .select("*, startups(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as DraftRow[];
}

export interface NewsItem {
  id: string;
  name: string;
  stage: string | null;
  amount_usd: number | null;
  currency_raw: string | null;
  investors: string[];
  founders: string[];
  sector: string | null;
  geography: string | null;
  announced_at: string | null;
  source_url: string | null;
  fit_score: number | null;
  fit_reason: string | null;
  news_status: "queued" | "contacted" | "below_threshold" | "skipped";
  sort_at: string;
}

/**
 * Every pre-seed/seed announcement found, regardless of thesis fit — a market-wide
 * feed, not just the ones that became drafts. Combines `startups` (fit >= threshold,
 * or manually promoted) with `rejected_log` rows for reject_reason = 'below_threshold'
 * (still a real pre-seed/seed round, just not pursued).
 */
export async function getNewsItems(limit = 200): Promise<NewsItem[]> {
  const supabase = getSupabaseAdmin();

  const [{ data: startups, error: startupsError }, { data: belowThreshold, error: rejectedError }] =
    await Promise.all([
      supabase.from("startups").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase
        .from("rejected_log")
        .select("*")
        .eq("reject_reason", "below_threshold")
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

  if (startupsError) throw new Error(startupsError.message);
  if (rejectedError) throw new Error(rejectedError.message);

  const fromStartups: NewsItem[] = (startups ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    stage: s.stage,
    amount_usd: s.amount_usd,
    currency_raw: s.currency_raw,
    investors: s.investors ?? [],
    founders: s.founders ?? [],
    sector: s.sector,
    geography: s.geography,
    announced_at: s.announced_at,
    source_url: s.source_url,
    fit_score: s.fit_score,
    fit_reason: s.fit_reason,
    news_status: s.status === "contacted" ? "contacted" : s.status === "queued" ? "queued" : "skipped",
    sort_at: s.announced_at ?? s.created_at,
  }));

  const fromRejected: NewsItem[] = (belowThreshold ?? [])
    .filter((r) => !r.promoted_startup_id) // promoted ones already appear via `startups`
    .map((r) => ({
      id: r.id,
      name: r.name ?? "(unknown)",
      stage: r.stage,
      amount_usd: r.amount_usd,
      currency_raw: r.currency_raw,
      investors: r.investors ?? [],
      founders: r.founders ?? [],
      sector: r.sector,
      geography: r.geography,
      announced_at: r.announced_at,
      source_url: r.source_url,
      fit_score: r.fit_score,
      fit_reason: r.detail,
      news_status: "below_threshold" as const,
      sort_at: r.announced_at ?? r.created_at,
    }));

  // Default order: highest fit score first (nulls/unscored last), so the
  // best-fitting announcements are what Rohit sees at the top of the feed.
  return [...fromStartups, ...fromRejected].sort((a, b) => {
    if (a.fit_score == null && b.fit_score == null) return 0;
    if (a.fit_score == null) return 1;
    if (b.fit_score == null) return -1;
    return b.fit_score - a.fit_score;
  });
}

export async function getRejected(limit = 200): Promise<RejectedRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("rejected_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as RejectedRow[];
}

export async function getRuns(limit = 30): Promise<RunRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as RunRow[];
}

export async function getActiveThesis(): Promise<Thesis> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("thesis")
    .select("*")
    .eq("is_active", true)
    .single();
  if (error) throw new Error(error.message);
  return data as Thesis;
}
