"use client";

import { useState } from "react";
import type { RejectedRow } from "@/lib/dashboard-data";
import PromoteButton from "@/components/PromoteButton";
import ClientDate from "@/components/ClientDate";

const REASON_LABELS: Record<string, string> = {
  not_funding: "Not a funding announcement",
  not_seed: "Not pre-seed/seed stage",
  below_threshold: "Below fit threshold",
};

const REASON_FILTERS = [
  { key: "all", label: "All" },
  { key: "below_threshold", label: "Below threshold" },
  { key: "not_seed", label: "Not seed" },
  { key: "not_funding", label: "Not funding" },
] as const;

export default function RejectedTable({ rejected }: { rejected: RejectedRow[] }) {
  const [filter, setFilter] = useState<(typeof REASON_FILTERS)[number]["key"]>("all");

  const counts = Object.fromEntries(
    REASON_FILTERS.map((f) => [
      f.key,
      f.key === "all" ? rejected.length : rejected.filter((r) => r.reject_reason === f.key).length,
    ])
  );

  const visible =
    filter === "all" ? rejected : rejected.filter((r) => r.reject_reason === filter);

  return (
    <div className="stack">
      <div className="row">
        {REASON_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`button ${filter === f.key ? "buttonPrimary" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card emptyState">No rows match this filter.</div>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Stage</th>
                <th>Score</th>
                <th>Reason</th>
                <th>Detail</th>
                <th>Source</th>
                <th>When</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>{r.name || "—"}</td>
                  <td>{r.stage || "—"}</td>
                  <td>{r.fit_score ?? "—"}</td>
                  <td>
                    <span className="badge badgeDanger">
                      {REASON_LABELS[r.reject_reason] ?? r.reject_reason}
                    </span>
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    {r.detail || "—"}
                    {(r.investors.length > 0 || r.amount_usd) && (
                      <div className="helperText" style={{ marginTop: 4 }}>
                        {r.amount_usd ? `$${r.amount_usd.toLocaleString("en-US")}` : null}
                        {r.investors.length > 0 ? ` · ${r.investors.join(", ")}` : ""}
                      </div>
                    )}
                  </td>
                  <td>
                    {r.source_url ? (
                      <a href={r.source_url} target="_blank" rel="noreferrer">
                        link ↗
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <ClientDate iso={r.created_at} />
                  </td>
                  <td>
                    {r.promoted_at ? (
                      <span className="badge badgeSuccess">promoted</span>
                    ) : r.reject_reason === "below_threshold" ? (
                      <PromoteButton id={r.id} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
