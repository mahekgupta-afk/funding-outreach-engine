import { getRejected } from "@/lib/dashboard-data";

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
          Audit trail only — these never appear in the drafts queue. Kept so a wrong rejection is
          visible and checkable, not silently invisible.
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
                  <td style={{ maxWidth: 320 }}>{r.detail || "—"}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
