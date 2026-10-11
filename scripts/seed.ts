/**
 * Seeds ~5 realistic sample startups + drafts, plus 3 rejected_log rows, so the
 * dashboard has something to show even if every live feed is down (or at
 * first-time setup, before any scheduled run has happened).
 *
 * Every sample row's source_url is tagged with SAMPLE_SOURCE_MARKER so the
 * dashboard can clearly label it as sample data rather than a real lead.
 *
 * Usage: npm run db:seed
 */
import { getSupabaseAdmin } from "../lib/supabase";
import { dedupeKeyFor, normalizeDomain } from "../lib/dedupe";
import { SAMPLE_SOURCE_MARKER } from "../lib/constants";

function sampleUrl(slug: string): string {
  return `https://${SAMPLE_SOURCE_MARKER}/articles/${slug}`;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

interface SampleStartup {
  slug: string;
  name: string;
  website: string;
  stage: string;
  amount_usd: number;
  currency_raw: string;
  investors: string[];
  founders: string[];
  sector: string;
  geography: string;
  announced_days_ago: number;
  fit_score: number;
  fit_reason: string;
  subject: string;
  body: string;
}

const SAMPLE_STARTUPS: SampleStartup[] = [
  {
    slug: "verdant-grid-seed",
    name: "Verdant Grid",
    website: "https://verdantgrid.example.com",
    stage: "seed",
    amount_usd: 1_800_000,
    currency_raw: "$1.8M",
    investors: ["Blume Ventures", "Climate Capital Collective"],
    founders: ["Ananya Rao"],
    sector: "climate",
    geography: "India",
    announced_days_ago: 1,
    fit_score: 84,
    fit_reason:
      "Verdant Grid matches the climate sector focus, India geography, seed stage, and round size exactly, with a technical founder (ex-Tesla battery engineer) and an early pilot with three commercial buildings as evidence of traction.",
    subject: "Verdant Grid's seed round and Accelerator",
    body: "Hi Ananya,\n\nCongratulations on closing your $1.8M seed round with Blume Ventures and Climate Capital Collective — building battery-backed demand response for commercial buildings is exactly the kind of climate infrastructure we like to back.\n\nI lead recruitment at Accelerator. We run a 12-week program with up to $100k in funding, a dedicated mentor network, and an investor demo day. Given your pilot with three commercial buildings already underway, I think our operator network could help you get to your next ten customers faster.\n\nWould you have 15 minutes for a call next week?\n\nBest,\nRohit\nHead of Program Recruitment\nAccelerator",
  },
  {
    slug: "paywise-preseed",
    name: "PayWise",
    website: "https://paywise.example.com",
    stage: "pre-seed",
    amount_usd: 600_000,
    currency_raw: "₹5 crore",
    investors: ["India Quotient"],
    founders: ["Karan Mehta", "Divya Nair"],
    sector: "fintech",
    geography: "India",
    announced_days_ago: 1,
    fit_score: 78,
    fit_reason:
      "PayWise fits the fintech sector, India geography, pre-seed stage, and round size cleanly. Two technical co-founders (both ex-Razorpay) satisfy the technical-founder criterion, though traction evidence is still early (closed beta only).",
    subject: "PayWise's pre-seed round and Accelerator",
    body: "Hi Karan and Divya,\n\nSaw the news on PayWise's ₹5 crore pre-seed round led by India Quotient — a payout API built by ex-Razorpay engineers for SMB marketplaces is a sharp wedge.\n\nI'm with Accelerator; we run a 12-week program (up to $100k, a mentor network, and an investor demo day) built for exactly this stage. I'd love to hear how the closed beta is going and see if our program could help you open it up faster.\n\nOpen to a short call next week?\n\nBest,\nRohit\nHead of Program Recruitment\nAccelerator",
  },
  {
    slug: "clerestory-ai-seed",
    name: "Clerestory AI",
    website: "https://clerestory.example.com",
    stage: "seed",
    amount_usd: 2_400_000,
    currency_raw: "$2.4M",
    investors: ["Accel", "Surge"],
    founders: ["Priya Subramanian"],
    sector: "ai",
    geography: "Southeast Asia",
    announced_days_ago: 2,
    fit_score: 80,
    fit_reason:
      "Clerestory AI matches the AI sector, Southeast Asia geography, seed stage, and round size. The founder's background (ex-Google DeepMind) and three paying design-partner customers are strong traction signals.",
    subject: "Clerestory AI's seed round and Accelerator",
    body: "Hi Priya,\n\nCongratulations on the $2.4M seed round with Accel and Surge — an AI QA layer for manufacturing lines with three paying design partners already is a great starting point.\n\nI run recruitment at Accelerator (12-week program, up to $100k, mentor network, investor demo day). Given you're scaling past the design-partner stage, I think our Southeast Asia operator network could help with your next round of enterprise pilots.\n\nWould a 15-minute call next week work?\n\nBest,\nRohit\nHead of Program Recruitment\nAccelerator",
  },
  {
    slug: "healthloop-preseed",
    name: "HealthLoop",
    website: "https://healthloop.example.com",
    stage: "pre-seed",
    amount_usd: 450_000,
    currency_raw: "$450K",
    investors: ["Antler"],
    founders: ["Farah Idris"],
    sector: "healthtech",
    geography: "Southeast Asia",
    announced_days_ago: 1,
    fit_score: 73,
    fit_reason:
      "HealthLoop fits the healthtech sector, Southeast Asia geography, pre-seed stage, and round size. The founder's clinical background is a plus, but the product is still pre-launch, so traction can't yet be verified.",
    subject: "HealthLoop's pre-seed round and Accelerator",
    body: "Hi Farah,\n\nSaw HealthLoop's $450K pre-seed round from Antler — post-discharge medication adherence tracking for clinics in Jakarta is a real gap.\n\nI'm with Accelerator; our 12-week program (up to $100k, mentor network, investor demo day) is built for teams at exactly this pre-launch stage. I'd love to hear more about your clinic pilots as you get close to launch.\n\nCould we grab 15 minutes next week?\n\nBest,\nRohit\nHead of Program Recruitment\nAccelerator",
  },
  {
    slug: "ledgerline-seed",
    name: "Ledgerline",
    website: "https://ledgerline.example.com",
    stage: "seed",
    amount_usd: 2_900_000,
    currency_raw: "$2.9M",
    investors: ["Sequoia Surge", "Better Capital"],
    founders: ["Rohan Kapoor", "Meera Iyer"],
    sector: "saas",
    geography: "India",
    announced_days_ago: 2,
    fit_score: 76,
    fit_reason:
      "Ledgerline matches the SaaS sector, India geography, seed stage, and round size (just under the $3M max). Two technical co-founders and 40 paying SMB customers are solid traction, though the round size leaves little headroom against the thesis ceiling.",
    subject: "Ledgerline's seed round and Accelerator",
    body: "Hi Rohan and Meera,\n\nCongrats on the $2.9M seed round with Sequoia Surge and Better Capital — reconciliation software with 40 paying SMB customers already is a strong base to build from.\n\nI lead recruitment at Accelerator (12-week program, up to $100k, mentor network, investor demo day). I'd love to learn more about how you're thinking about expansion beyond your first 40 customers.\n\nFree for a short call next week?\n\nBest,\nRohit\nHead of Program Recruitment\nAccelerator",
  },
];

interface SampleRejected {
  slug: string;
  name: string;
  stage: string;
  fit_score: number | null;
  reject_reason: "not_funding" | "not_seed" | "below_threshold";
  detail: string;
}

const SAMPLE_REJECTED: SampleRejected[] = [
  {
    slug: "scalefin-series-b",
    name: "ScaleFin",
    stage: "series-b",
    fit_score: null,
    reject_reason: "not_seed",
    detail: "ScaleFin raised a $40M Series B — well past the thesis's pre-seed/seed stage filter.",
  },
  {
    slug: "brightpath-acquired",
    name: "BrightPath",
    stage: "unknown",
    fit_score: null,
    reject_reason: "not_funding",
    detail: "Article was about BrightPath being acquired by a larger competitor, not a funding round.",
  },
  {
    slug: "glowbet-seed",
    name: "GlowBet",
    stage: "seed",
    fit_score: 8,
    reject_reason: "below_threshold",
    detail:
      "GlowBet raised a $1.2M seed round, but operates in online sports betting — squarely in the thesis's excluded sectors (gambling). Scored well below threshold despite otherwise matching stage and round size.",
  },
];

async function main() {
  const supabase = getSupabaseAdmin();
  let created = 0;
  let skipped = 0;

  for (const s of SAMPLE_STARTUPS) {
    const dedupeKey = dedupeKeyFor(s.name, s.website);
    const { data: startupId, error } = await supabase.rpc("insert_startup_and_draft", {
      p_dedupe_key: dedupeKey,
      p_name: s.name,
      p_website: s.website,
      p_domain: normalizeDomain(s.website),
      p_stage: s.stage,
      p_amount_usd: s.amount_usd,
      p_currency_raw: s.currency_raw,
      p_investors: s.investors,
      p_founders: s.founders,
      p_sector: s.sector,
      p_geography: s.geography,
      p_announced_at: daysAgo(s.announced_days_ago),
      p_source_url: sampleUrl(s.slug),
      p_fit_score: s.fit_score,
      p_fit_reason: s.fit_reason,
      p_to_name: s.founders[0] ?? null,
      p_to_email: null,
      p_subject: s.subject,
      p_body: s.body,
      p_research_quality: "ok",
    });

    if (error) {
      console.error(`Failed to seed ${s.name}:`, error.message);
      continue;
    }
    if (startupId) {
      created++;
      console.log(`Seeded startup + draft: ${s.name}`);
    } else {
      skipped++;
      console.log(`Skipped ${s.name} (dedupe_key already exists — already seeded)`);
    }
  }

  for (const r of SAMPLE_REJECTED) {
    const { data: existing } = await supabase
      .from("rejected_log")
      .select("id")
      .eq("source_url", sampleUrl(r.slug))
      .maybeSingle();

    if (existing) {
      console.log(`Skipped rejected_log row ${r.name} (already seeded)`);
      continue;
    }

    const { error } = await supabase.from("rejected_log").insert({
      dedupe_key: `name:${r.name.toLowerCase()}`,
      name: r.name,
      stage: r.stage,
      fit_score: r.fit_score,
      reject_reason: r.reject_reason,
      detail: r.detail,
      source_url: sampleUrl(r.slug),
    });
    if (error) {
      console.error(`Failed to seed rejected row ${r.name}:`, error.message);
    } else {
      console.log(`Seeded rejected_log row: ${r.name}`);
    }
  }

  console.log(`\nDone. ${created} startup(s)+draft(s) created, ${skipped} already present.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
