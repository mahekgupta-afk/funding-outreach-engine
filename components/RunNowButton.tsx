"use client";

import { useState, useTransition } from "react";
import { runPipelineAction } from "@/app/actions";
import type { RunSummary } from "@/lib/pipeline";

export default function RunNowButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const summary = await runPipelineAction();
        setResult(summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Run failed");
      }
    });
  }

  return (
    <div className="stack">
      <div className="row">
        <button className="button buttonPrimary" onClick={handleClick} disabled={isPending}>
          {isPending ? "Running…" : "Run now"}
        </button>
        <span className="helperText">
          Runs the full pipeline immediately against the thesis below, instead of waiting for the
          next scheduled run.
        </span>
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      {result && (
        <div className="card">
          <p className="helperText">
            Fetched {result.articles_fetched} articles ({result.articles_new} new) ·{" "}
            {result.funding_found} funding announcements · {result.seed_stage} pre-seed/seed ·{" "}
            <strong>{result.drafts_created} draft(s) created</strong> · {result.rejected} rejected
          </p>
          {result.errors.length > 0 && (
            <p className="helperText" style={{ color: "var(--danger)" }}>
              {result.errors.length} error(s) — see the Runs page for details.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
