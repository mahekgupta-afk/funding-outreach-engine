import { getRejected } from "@/lib/dashboard-data";
import PromoteButton from "@/components/PromoteButton";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  not_funding: "Not a funding announcement",
  not_seed: "Not pre-seed/seed stage",
  below_threshold: "Below fit threshold",
};

export default async function RejectedPage() {
  const rejected = await getRejected();

  return (
    <div className="container stack">
      <div className="pageHeader">
        <h1>Rejected log</h1>
        <p>
          Audit trail only — these never appear in the drafts queue by default. Kept so a wrong
          rejection is visible and checkable, not silently invisible. Below-threshold rejections
          can be promoted into a real draft if you disagree with the score.
        </p>
      </div>

      {rejected.length === 0 ? (
        <div className="card emptyState">Nothing rejected yet.</div>
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
              {rejected.map((r) => (
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
                        {r.amount_usd ? `$${r.amount_usd.toLocaleString()}` : null}
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
                    {new Date(r.created_at).toLocaleString()}
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
