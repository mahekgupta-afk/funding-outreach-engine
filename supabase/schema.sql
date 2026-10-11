-- Timed Funding Outreach Engine — schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE where possible.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- thesis: Rohit edits this row in Supabase. Code only ever reads it.
-- ---------------------------------------------------------------------------
create table if not exists thesis (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'default',
  is_active boolean not null default true,
  accelerator_name text not null,
  description text not null,               -- free text thesis passed to the LLM
  target_sectors text[] not null default '{}',
  excluded_sectors text[] not null default '{}',
  target_geographies text[] not null default '{}',
  stages text[] not null default '{pre-seed,seed}',
  min_round_usd bigint,
  max_round_usd bigint,
  fit_threshold int not null default 65,   -- 0-100, configurable
  sender_name text,
  sender_title text,
  program_pitch text,                      -- what the accelerator offers, used in drafts
  updated_at timestamptz not null default now()
);

-- Only one active thesis at a time
create unique index if not exists one_active_thesis on thesis (is_active) where is_active;

-- ---------------------------------------------------------------------------
-- seen_articles: every article we've looked at, so a run never re-processes one
-- ---------------------------------------------------------------------------
create table if not exists seen_articles (
  url text primary key,
  source text,
  title text,
  published_at timestamptz,
  first_seen_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- startups: one row per deduped startup we've extracted a funding event for
-- ---------------------------------------------------------------------------
create table if not exists startups (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,         -- normalised domain, else normalised name
  name text not null,
  website text,
  domain text,
  stage text,
  amount_usd bigint,
  currency_raw text,
  investors text[] default '{}',
  founders text[] default '{}',
  sector text,
  geography text,
  announced_at timestamptz,
  source_url text,
  fit_score int,
  fit_reason text,
  status text not null default 'queued',   -- queued | contacted | rejected | skipped
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- drafts: the approval queue Rohit reviews. Nothing here is ever auto-sent.
-- ---------------------------------------------------------------------------
create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references startups(id) on delete cascade,
  to_name text,
  to_email text,                           -- often unknown; Rohit fills in
  subject text not null,
  body text not null,
  status text not null default 'pending_review', -- pending_review | approved | sent | discarded
  research_quality text default 'ok',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- rejected_log: audit trail only. Never shown on the main dashboard.
-- ---------------------------------------------------------------------------
create table if not exists rejected_log (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text,
  name text,
  stage text,
  fit_score int,
  reject_reason text not null,             -- e.g. 'below_threshold', 'not_seed', 'not_funding'
  detail text,
  source_url text,
  created_at timestamptz not null default now(),
  -- Extracted fields, stored so a below_threshold rejection can be promoted
  -- into a real draft later without re-fetching/re-extracting the article.
  website text,
  domain text,
  amount_usd bigint,
  currency_raw text,
  investors text[] default '{}',
  founders text[] default '{}',
  sector text,
  geography text,
  announced_at timestamptz,
  -- Set once a human overrides the rejection via the dashboard's "Promote" action.
  promoted_at timestamptz,
  promoted_startup_id uuid references startups(id)
);

-- ---------------------------------------------------------------------------
-- runs: one row per /api/run invocation, for observability
-- ---------------------------------------------------------------------------
create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  articles_fetched int default 0,
  articles_new int default 0,
  funding_found int default 0,
  seed_stage int default 0,
  drafts_created int default 0,
  rejected int default 0,
  errors jsonb default '[]'
);

-- ---------------------------------------------------------------------------
-- Row Level Security: lock every table down from the client.
-- The app only ever talks to Supabase with the service role key on the
-- server, which bypasses RLS entirely. No policies are defined, so the
-- anon/authenticated roles (i.e. a browser using NEXT_PUBLIC_SUPABASE_ANON_KEY)
-- get zero direct access to any table.
-- ---------------------------------------------------------------------------
alter table thesis enable row level security;
alter table seen_articles enable row level security;
alter table startups enable row level security;
alter table drafts enable row level security;
alter table rejected_log enable row level security;
alter table runs enable row level security;

-- ---------------------------------------------------------------------------
-- insert_startup_and_draft: atomically creates a startup + its draft, or does
-- nothing if dedupe_key already exists (two overlapping runs, or two articles
-- about the same startup, can never produce two drafts). Runs as one
-- transaction since a plpgsql function body is one.
-- ---------------------------------------------------------------------------
create or replace function insert_startup_and_draft(
  p_dedupe_key text,
  p_name text,
  p_website text,
  p_domain text,
  p_stage text,
  p_amount_usd bigint,
  p_currency_raw text,
  p_investors text[],
  p_founders text[],
  p_sector text,
  p_geography text,
  p_announced_at timestamptz,
  p_source_url text,
  p_fit_score int,
  p_fit_reason text,
  p_to_name text,
  p_to_email text,
  p_subject text,
  p_body text,
  p_research_quality text
) returns uuid
language plpgsql
as $$
declare
  v_startup_id uuid;
begin
  insert into startups (
    dedupe_key, name, website, domain, stage, amount_usd, currency_raw,
    investors, founders, sector, geography, announced_at, source_url,
    fit_score, fit_reason, status
  ) values (
    p_dedupe_key, p_name, p_website, p_domain, p_stage, p_amount_usd, p_currency_raw,
    p_investors, p_founders, p_sector, p_geography, p_announced_at, p_source_url,
    p_fit_score, p_fit_reason, 'queued'
  )
  on conflict (dedupe_key) do nothing
  returning id into v_startup_id;

  if v_startup_id is null then
    return null;
  end if;

  insert into drafts (startup_id, to_name, to_email, subject, body, status, research_quality)
  values (v_startup_id, p_to_name, p_to_email, p_subject, p_body, 'pending_review', p_research_quality);

  return v_startup_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed thesis row (placeholder — edit freely in the Table Editor later)
-- ---------------------------------------------------------------------------
insert into thesis (accelerator_name, description, target_sectors, excluded_sectors,
  target_geographies, min_round_usd, max_round_usd, fit_threshold,
  sender_name, sender_title, program_pitch)
select
  'Accelerator',
  'We back early-stage B2B software, fintech and climate startups building in India and Southeast Asia, with technical founders and evidence of early traction.',
  '{saas,fintech,climate,ai,healthtech}', '{gambling,adult,crypto-trading}',
  '{India,Southeast Asia}', 250000, 3000000, 65,
  'Rohit', 'Head of Program Recruitment',
  '12-week program, up to $100k, mentor network, investor demo day.'
where not exists (select 1 from thesis);
