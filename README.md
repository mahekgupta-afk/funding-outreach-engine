# Timed Funding Outreach Engine

Finds startups that announced a pre-seed/seed round in the last 24 hours, scores them against a
configurable accelerator thesis, and drops a personalised draft email into a review queue —
without ever sending anything automatically.

Built for the MESA Cohort C4 "AI and its Applications" final exam (Timed Funding Outreach Engine).

> Full architecture, data flow, and prompts are documented inline in the code and in
> `supabase/schema.sql`. This README covers setup, env vars, and operating the system.

## Status

Work in progress — this section and the rest of the README will be filled in as each build step
lands (schema, ingestion, scoring, drafting, dashboard, scheduler, deploy).

## Stack

- **Framework:** Next.js (App Router, TypeScript) — API routes + dashboard in one project
- **Hosting:** Vercel Hobby (free tier)
- **Database:** Supabase Postgres (free tier)
- **AI:** Gemini Flash via a direct REST call to the Google AI Studio API — **no Claude/Anthropic API is used anywhere**
- **Scheduler:** GitHub Actions cron (every 2 hours) calling `POST /api/run`
- **Sources:** RSS feeds (TechCrunch, Inc42, Entrackr, YourStory), Google News RSS, Hacker News Algolia API

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Defaults to `gemini-flash-latest` (always the current Flash model) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (service role key is server-only, never exposed to the client) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `CRON_SECRET` | Any random string you generate; set the same value in GitHub Actions secrets |
| `LOOKBACK_HOURS` | How far back to look for fresh announcements (default 24) |
| `MAX_ARTICLES_PER_RUN` | Cap to stay within Gemini free-tier rate limits (default 40) |

Set the same variables in the Vercel project settings for production.

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

## Free-tier limits to be aware of

- Supabase free projects pause after about a week of inactivity — the 2-hour scheduled job keeps it awake.
- GitHub Actions scheduled workflows can be delayed and are disabled after 60 days of repo inactivity (a daily Vercel cron is included as a fallback).
- Gemini free tier has rate limits — the pipeline batches extraction calls and backs off on 429s.

## Editing the accelerator thesis

Rohit edits the thesis (target sectors, geographies, stage, round size, fit threshold, sender
details) directly in the Supabase `thesis` table (via the Table Editor or the `/thesis` page in
the dashboard). No code change or redeploy is needed — every pipeline run reads the active thesis
fresh from the database.
