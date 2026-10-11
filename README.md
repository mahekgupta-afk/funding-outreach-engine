# Timed Funding Outreach Engine

Finds startups that announced a pre-seed/seed round in the last 24 hours, scores them against a
configurable accelerator thesis, and drops a personalised draft email into a review queue —
without ever sending anything automatically.

Built for the MESA Cohort C4 "AI and its Applications" final exam (Timed Funding Outreach Engine).

## Architecture

```
GitHub Actions (every 2h) / Vercel cron (daily fallback)
  -> POST or GET /api/run  (requires Authorization: Bearer CRON_SECRET)
     1. Load the active thesis fresh from Supabase (no caching)
     2. Ingest 12 sources in parallel (RSS + Google News + HN Algolia);
        a failing source is logged and skipped, never fails the run
     3. Keep only articles published within LOOKBACK_HOURS
     4. Drop URLs already in seen_articles; record the new ones
     5. Gemini: classify + extract structured fields, batched 10/call
     6. Keep only confirmed pre-seed/seed funding announcements
        (everything else -> rejected_log)
     7. Compute dedupe_key (domain, else normalised name); skip if a
        startup with that key already exists
     8. Fetch the startup's website (falls back to the article snippet
        on failure)
     9. Gemini: score fit against the thesis (0-100)
    10. Fit gate: score < thesis.fit_threshold -> rejected_log, stop
    11. Gemini: draft a personalised outreach email
    12. Atomically insert into startups + drafts (DB function
        insert_startup_and_draft; no-op if dedupe_key already exists)
  -> writes one `runs` row with counts and any errors

Dashboard (Next.js, no login):
  /        Today's drafts — review, edit, copy, mailto, approve/sent/discard
  /thesis  Edit the thesis + "Run now" (server action; never exposes CRON_SECRET)
  /rejected  Audit log — never mixed into the drafts queue
  /runs    Every pipeline execution with per-stage counts and errors
```

Rohit never sees a draft for a startup that doesn't fit — rejections (wrong stage, excluded
sector, below threshold) only ever land in `/rejected`, kept there purely as an audit trail.

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript) — API routes + dashboard in one project
- **Hosting:** Vercel Hobby (free tier)
- **Database:** Supabase Postgres (free tier)
- **AI:** Gemini Flash-Lite via a direct REST call to the Google AI Studio API (`lib/gemini.ts`) —
  **no Claude/Anthropic API is used anywhere**
- **Scheduler:** GitHub Actions cron (every 2 hours) + a daily Vercel cron fallback, both calling
  `/api/run`
- **Sources:** TechCrunch, Inc42, Entrackr, YourStory RSS feeds, 6 Google News RSS searches, and
  the Hacker News Algolia API (`lib/sources.ts`) — 12 sources total, each isolated so one failing
  feed never fails the run

### Why Gemini Flash-*Lite*, not plain Flash

The build spec calls for "Gemini Flash". In testing (October 2026), the full Flash model
(`gemini-3.8-flash`, resolved via the `gemini-flash-latest` alias) turned out to have an
extremely low free-tier quota — about **20 requests/day** — which a pipeline running every 2 hours
blows through in a single run. `gemini-flash-lite-latest` (Flash-*Lite*) is a separate quota
bucket with a far higher free-tier daily limit (several hundred to ~1500 requests/day as measured
at the time) and produced equally correct, well-structured JSON for extraction, fit scoring, and
drafting in testing. `GEMINI_MODEL` in `.env.example` defaults to it; swap it back to
`gemini-flash-latest` if your account's quota allows.

### Why a direct REST call instead of the `@google/genai` SDK

The official `@google/genai` SDK was observed to hang indefinitely on `generateContent()` calls in
this deployment environment, while a plain `fetch` to the same
`generativelanguage.googleapis.com` endpoint returned normally and fast. `lib/gemini.ts` calls the
REST API directly — one fewer dependency, and no SDK-specific failure mode to debug.

## Data model

See `supabase/schema.sql` for the full schema (6 tables: `thesis`, `seen_articles`, `startups`,
`drafts`, `rejected_log`, `runs`) plus the `insert_startup_and_draft` Postgres function that
atomically creates a startup and its draft together — this is what guarantees "two articles about
the same startup produce exactly one draft" even under concurrent runs.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Defaults to `gemini-flash-lite-latest` — see above for why |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (service role key is server-only, never exposed to the client) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `CRON_SECRET` | Any random string you generate (e.g. `openssl rand -hex 32`); set the same value in GitHub Actions secrets |
| `LOOKBACK_HOURS` | How far back to look for fresh announcements (default 24) |
| `MAX_ARTICLES_PER_RUN` | Cap to stay within Gemini free-tier rate limits (default 40) |

Set the same variables in the Vercel project settings for production. `.env.local` is gitignored
and never committed.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

To trigger a pipeline run locally:

```bash
curl -X POST http://localhost:3000/api/run -H "Authorization: Bearer $CRON_SECRET"
```

To populate the dashboard with sample data (useful before any live run has happened, or if feeds
are temporarily down):

```bash
npm run db:seed
```

This inserts 5 realistic sample startups + drafts and 3 sample rejected-log rows, each tagged so
the dashboard clearly labels them "sample data" rather than mixing them in with real leads.
Running it twice is safe — it skips anything already seeded.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import Project** from that repo.
3. Add every variable from `.env.example` (with real values) in **Project Settings → Environment
   Variables**.
4. Deploy. Note the deployed URL (e.g. `https://your-project.vercel.app`).
5. In the GitHub repo, add two **Actions secrets** (Settings → Secrets and variables → Actions):
   - `APP_URL` = your Vercel URL (no trailing slash)
   - `CRON_SECRET` = the same value you set in Vercel
6. The GitHub Actions workflow (`.github/workflows/run-pipeline.yml`) will now call `/api/run`
   every 2 hours. You can also trigger it manually from the Actions tab (`workflow_dispatch`).
7. `vercel.json` adds a once-daily Vercel cron as a fallback in case the GitHub Actions schedule
   is delayed or (after 60 days of repo inactivity) disabled.

## Free-tier limits to be aware of

- **Supabase** free projects pause after about a week of inactivity — the 2-hour scheduled job
  keeps it awake.
- **GitHub Actions** scheduled workflows can be delayed and are disabled after 60 days of repo
  inactivity — the daily Vercel cron (`vercel.json`) is a fallback for this.
- **Gemini** free tier has per-model rate limits; see "Why Gemini Flash-*Lite*" above. The
  pipeline batches extraction calls (10 articles/call), limits articles processed per run
  (`MAX_ARTICLES_PER_RUN`), and retries with exponential backoff on 429/503.
- **Vercel Hobby** functions can run up to 300 seconds (`maxDuration` in `app/api/run/route.ts`);
  if a run risks exceeding that, lower `MAX_ARTICLES_PER_RUN`.

## Editing the accelerator thesis

Rohit edits the thesis (target sectors, geographies, stage, round size, fit threshold, sender
details) either on the `/thesis` dashboard page or directly in the Supabase Table Editor. No code
change or redeploy is needed — every pipeline run reads the active thesis fresh from the database.

## Acceptance checks performed during development

- 12 live sources ingested in parallel with zero errors; one source deliberately broken in testing
  still let the run complete (734/754 articles — only the broken source's articles missing).
- An article outside `LOOKBACK_HOURS` is correctly dropped.
- Real Series C / non-funding articles are correctly classified out (`not_seed` / `not_funding`)
  and never produce a draft.
- Lowering `thesis.fit_threshold` in Supabase (no redeploy) immediately changed which startups
  passed the fit gate on the next run.
- Below-threshold startups appear only in `/rejected`, never in the drafts queue.
- Running `/api/run` twice in a row creates zero new drafts the second time; two different article
  URLs about the same startup collapse to exactly one draft.
- Spot-checked drafts reference specific, real details (round size, named investors, product
  specifics) rather than generic boilerplate.
- No code path sends email — the dashboard only offers copy-to-clipboard and `mailto:` links.
- `/api/run` returns 401 without the correct bearer token; no secrets are committed to git.
