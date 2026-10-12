import { getNewsItems } from "@/lib/dashboard-data";
import { isSampleSource } from "@/lib/constants";

export const dynamic = "force-dynamic";

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

export default async function NewsPage() {
  const items = await getNewsItems();

  return (
    <div className="container stack">
      <div className="pageHeader">
        <h1>News</h1>
        <p>
          Every pre-seed/seed funding announcement found across all sources — whether or not it
          fits the current thesis. For the ones being pursued, see the Email tab; for a wrong
          rejection you want to override, see Rejected.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card emptyState">
          No pre-seed/seed announcements found yet. Trigger a run from the{" "}
          <a href="/thesis">Thesis</a> page, or check back after the next scheduled run.
        </div>
      ) : (
        <div className="stack">
          {items.map((item) => {
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
