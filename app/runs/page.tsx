import { getRuns } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await getRuns();

  return (
    <div className="container stack">
      <div className="pageHeader">
        <h1>Runs</h1>
        <p>Every pipeline execution, scheduled or manual, with counts at each stage.</p>
      </div>

      {runs.length === 0 ? (
        <div className="card emptyState">No runs yet.</div>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Duration</th>
                <th>Fetched</th>
                <th>New</th>
                <th>Funding</th>
                <th>Seed stage</th>
                <th>Drafts</th>
                <th>Rejected</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const durationMs = r.finished_at
                  ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                  : null;
                const errors = Array.isArray(r.errors) ? r.errors : [];
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(r.started_at).toLocaleString()}
                    </td>
                    <td>{durationMs != null ? `${Math.round(durationMs / 1000)}s` : "running…"}</td>
                    <td>{r.articles_fetched}</td>
                    <td>{r.articles_new}</td>
                    <td>{r.funding_found}</td>
                    <td>{r.seed_stage}</td>
                    <td>
                      <strong>{r.drafts_created}</strong>
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
