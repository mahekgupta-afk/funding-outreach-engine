import { getRuns } from "@/lib/dashboard-data";
import RunsTable from "@/components/RunsTable";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function RunsPage() {
  const runs = await getRuns();

  const totalDrafts = runs.reduce((sum, r) => sum + r.drafts_created, 0);
  const totalNew = runs.reduce((sum, r) => sum + r.articles_new, 0);
  const totalErrors = runs.reduce(
    (sum, r) => sum + (Array.isArray(r.errors) ? r.errors.length : 0),
    0
  );
  const durations = runs
    .filter((r) => r.finished_at)
    .map((r) => new Date(r.finished_at!).getTime() - new Date(r.started_at).getTime());
  const avgDurationS =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000)
      : null;
  const lastRun = runs[0];

  return (
    <div className="container stack">
      <div className="pageHeader">
        <h1>Runs</h1>
        <p>Every pipeline execution, scheduled or manual, over the last {runs.length} runs.</p>
      </div>

      {runs.length === 0 ? (
        <div className="card emptyState">No runs yet.</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            <div className="card stack" style={{ gap: 4 }}>
              <span className="helperText">Last run</span>
              <strong style={{ fontSize: "1.1rem" }}>{timeAgo(lastRun.started_at)}</strong>
              <span className="helperText">
                {lastRun.drafts_created > 0
                  ? `${lastRun.drafts_created} draft(s) created`
                  : "No drafts this run"}
              </span>
            </div>
            <div className="card stack" style={{ gap: 4 }}>
              <span className="helperText">Drafts created</span>
              <strong style={{ fontSize: "1.1rem" }}>{totalDrafts}</strong>
              <span className="helperText">across these runs</span>
            </div>
            <div className="card stack" style={{ gap: 4 }}>
              <span className="helperText">New articles found</span>
              <strong style={{ fontSize: "1.1rem" }}>{totalNew}</strong>
              <span className="helperText">across these runs</span>
            </div>
            <div className="card stack" style={{ gap: 4 }}>
              <span className="helperText">Avg. duration</span>
              <strong style={{ fontSize: "1.1rem" }}>
                {avgDurationS != null ? `${avgDurationS}s` : "—"}
              </strong>
              <span className="helperText">
                {totalErrors === 0 ? "0 errors" : `${totalErrors} error(s) total`}
              </span>
            </div>
          </div>

          <RunsTable runs={runs} />
        </>
      )}
    </div>
  );
}
