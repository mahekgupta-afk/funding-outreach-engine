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
