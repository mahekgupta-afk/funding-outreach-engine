"use client";

import { useState } from "react";
import type { RunRow } from "@/lib/dashboard-data";
import ClientDate from "@/components/ClientDate";

export default function RunsTable({ runs }: { runs: RunRow[] }) {
  const [showQuiet, setShowQuiet] = useState(false);

  const quietCount = runs.filter((r) => r.articles_new === 0).length;
  const visible = showQuiet ? runs : runs.filter((r) => r.articles_new > 0);

  return (
    <div className="stack">
      {quietCount > 0 && (
        <div className="row">
          <button className="button" onClick={() => setShowQuiet((s) => !s)}>
            {showQuiet ? `Hide quiet runs (${quietCount})` : `Show quiet runs (${quietCount} hidden)`}
          </button>
          <span className="helperText">
            A &quot;quiet&quot; run found 0 new articles — usually because nothing was published
            since the last run.
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card emptyState">
          Every run so far found 0 new articles. Click &quot;Show quiet runs&quot; above to see them.
        </div>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Duration</th>
                <th title="Raw articles returned by all 12 sources before dedup/freshness filtering — this is a near-fixed number (each source returns a fixed-size list), not a freshness signal.">
                  Pulled ⓘ
                </th>
                <th>New</th>
                <th>Funding</th>
                <th>Seed stage</th>
                <th>Drafts</th>
                <th>Rejected</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                  const durationMs = r.finished_at
                    ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                    : null;
                  const errors = Array.isArray(r.errors) ? r.errors : [];
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <ClientDate iso={r.started_at} />
                      </td>
                      <td>{durationMs != null ? `${Math.round(durationMs / 1000)}s` : "running…"}</td>
                      <td>{r.articles_fetched}</td>
                      <td>{r.articles_new}</td>
                      <td>{r.funding_found}</td>
                      <td>{r.seed_stage}</td>
                      <td>
                        {r.drafts_created > 0 ? (
                          <span className="badge badgeSuccess">{r.drafts_created}</span>
                        ) : (
                          0
                        )}
                      </td>
                      <td>{r.rejected}</td>
                      <td>
                        {errors.length > 0 ? (
                          <details>
                            <summary className="badge badgeWarning">{errors.length} error(s)</summary>
                            <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: "0.8rem" }}>
                              {errors.map((e, i) => (
                                <li key={i}>{String(e)}</li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
