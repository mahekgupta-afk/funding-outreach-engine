import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveThesis } from "@/lib/dashboard-data";
import { researchWebsite } from "@/lib/research";
import { scoreFit } from "@/lib/fit-score";
import { draftEmail } from "@/lib/draft";
import { dedupeKeyFor, normalizeDomain } from "@/lib/dedupe";
import type { Extraction } from "@/lib/extract";

/**
 * Lets a human override a below_threshold rejection from the dashboard: re-scores
 * and drafts the startup on demand, then inserts it exactly as a normal pipeline
 * run would. This is the concrete mitigation for "the LLM might wrongly reject a
 * good startup" — the rejected_log audit trail makes it visible, and this action
 * lets Rohit act on it with one click instead of only being able to see it.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: row, error: rowError } = await supabase
    .from("rejected_log")
    .select("*")
    .eq("id", id)
    .single();

  if (rowError || !row) {
    return NextResponse.json({ error: "Rejected row not found" }, { status: 404 });
  }
  if (row.promoted_at) {
    return NextResponse.json({ error: "Already promoted" }, { status: 400 });
  }
  if (row.reject_reason !== "below_threshold") {
    return NextResponse.json(
      { error: "Only below_threshold rejections can be promoted (not_funding/not_seed aren't real leads)" },
      { status: 400 }
    );
  }
  if (!row.name) {
    return NextResponse.json({ error: "Rejected row is missing a startup name" }, { status: 400 });
  }

  try {
    const thesis = await getActiveThesis();

    const extraction: Extraction = {
      article_index: 0,
      is_funding_announcement: true,
      startup_name: row.name,
      website: row.website,
      stage: row.stage ?? "unknown",
      amount_usd: row.amount_usd,
      amount_raw: row.currency_raw,
      investors: row.investors ?? [],
      founders: row.founders ?? [],
      sector: row.sector,
      geography: row.geography,
      announced_at: row.announced_at,
      one_line_description: row.detail ?? "",
    };

    const research = await researchWebsite(extraction.website);
    const websiteText = research.quality === "ok" ? research.text : extraction.one_line_description;

    // Re-score rather than trusting the stored (sub-threshold) score verbatim —
    // a human override should still reflect the current thesis, which may have
    // changed since this row was rejected.
    const fit = await scoreFit(thesis, extraction, websiteText);
    const draft = await draftEmail(thesis, extraction, fit, websiteText);

    const key = row.dedupe_key || dedupeKeyFor(extraction.startup_name, extraction.website);

    const { data: startupId, error: rpcError } = await supabase.rpc("insert_startup_and_draft", {
      p_dedupe_key: key,
      p_name: extraction.startup_name,
      p_website: extraction.website,
      p_domain: normalizeDomain(extraction.website),
      p_stage: extraction.stage,
      p_amount_usd: extraction.amount_usd,
      p_currency_raw: extraction.amount_raw,
      p_investors: extraction.investors,
      p_founders: extraction.founders,
      p_sector: extraction.sector,
      p_geography: extraction.geography,
      p_announced_at: extraction.announced_at,
      p_source_url: row.source_url,
      p_fit_score: fit.score,
      p_fit_reason: `Manually promoted by a reviewer, overriding an earlier below-threshold score of ${row.fit_score}. Re-scored reason: ${fit.reason}`,
      p_to_name: extraction.founders[0] ?? null,
      p_to_email: null,
      p_subject: draft.subject,
      p_body: draft.body,
      p_research_quality: research.quality,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }
    if (!startupId) {
      return NextResponse.json(
        { error: "A startup with this dedupe key already exists — check the drafts queue" },
        { status: 409 }
      );
    }

    await supabase
      .from("rejected_log")
      .update({ promoted_at: new Date().toISOString(), promoted_startup_id: startupId })
      .eq("id", id);

    return NextResponse.json({ startupId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
