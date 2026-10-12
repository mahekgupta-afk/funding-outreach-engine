"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/dashboard-data";
import { isSampleSource } from "@/lib/constants";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "queued", label: "Pursuing" },
  { key: "contacted", label: "Contacted" },
  { key: "below_threshold", label: "Below threshold" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  queued: "Pursuing",
  contacted: "Contacted",
  below_threshold: "Below threshold",
  skipped: "Skipped",
};

const STATUS_CLASS: Record<string, string> = {
  queued: "badgeSuccess",
  contacted: "badgeSuccess",
  below_threshold: "badgeWarning",
  skipped: "",
};

function formatAmount(amountUsd: number | null, currencyRaw: string | null): string {
  if (amountUsd == null) return currencyRaw || "Amount unknown";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
  return currencyRaw && currencyRaw !== formatted ? `${formatted} (${currencyRaw})` : formatted;
}

export default function NewsFeed({ items }: { items: NewsItem[] }) {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["key"]>("all");
  const [stageFilter, setStageFilter] = useState<"all" | "pre-seed" | "seed">("all");

  const stages = Array.from(new Set(items.map((i) => i.stage).filter(Boolean))) as string[];

  const visible = items.filter((item) => {
    if (statusFilter !== "all" && item.news_status !== statusFilter) return false;
    if (stageFilter !== "all" && item.stage !== stageFilter) return false;
    return true;
  });

  const counts = Object.fromEntries(
    STATUS_FILTERS.map((f) => [
      f.key,
      f.key === "all" ? items.length : items.filter((i) => i.news_status === f.key).length,
    ])
  );

  return (
    <div className="stack">
      <div className="row">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`button ${statusFilter === f.key ? "buttonPrimary" : ""}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
        {stages.length > 1 && (
          <select
            className="select"
            style={{ width: "auto" }}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as typeof stageFilter)}
          >
            <option value="all">All stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card emptyState">No announcements match this filter.</div>
      ) : (
        <div className="stack">
          {visible.map((item) => {
            const sample = isSampleSource(item.source_url);
            return (
              <div key={item.id} className="card stack">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="row">
                    <strong style={{ fontSize: "1.05rem" }}>{item.name}</strong>
                    {item.stage && <span className="badge">{item.stage}</span>}
                    {item.fit_score != null && (
                      <span className="badge badgeSuccess">fit {item.fit_score}</span>
                    )}
                    <span className={`badge ${STATUS_CLASS[item.news_status] ?? ""}`}>
                      {STATUS_LABELS[item.news_status] ?? item.news_status}
                    </span>
                    {sample && <span className="badge sampleBadge">sample data</span>}
                  </div>
                  {item.source_url && !sample && (
                    <a className="helperText" href={item.source_url} target="_blank" rel="noreferrer">
                      source ↗
                    </a>
                  )}
                </div>

                <div className="helperText">
                  {formatAmount(item.amount_usd, item.currency_raw)}
                  {item.investors.length ? ` · ${item.investors.join(", ")}` : ""}
                  {item.geography ? ` · ${item.geography}` : ""}
                  {item.sector ? ` · ${item.sector}` : ""}
                </div>

                {item.fit_reason && <p className="helperText">{item.fit_reason}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
