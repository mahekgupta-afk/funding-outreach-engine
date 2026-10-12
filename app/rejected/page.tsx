import { getRejected } from "@/lib/dashboard-data";
import RejectedTable from "@/components/RejectedTable";

export const dynamic = "force-dynamic";

export default async function RejectedPage() {
  const rejected = await getRejected();

  return (
    <div className="container stack">
      <div className="pageHeader">
        <h1>System rejected</h1>
        <p>
          Automatically filtered out by the pipeline before any draft was created — wrong stage,
          not a funding announcement, or below your fit threshold. Audit trail only, so a wrong
          rejection is visible and checkable, not silently invisible. Below-threshold rows can be
          promoted into a real draft if you disagree with the score. (Drafts you personally
          discarded after review live in Email → Discarded instead.)
        </p>
      </div>

      {rejected.length === 0 ? (
        <div className="card emptyState">Nothing rejected yet.</div>
      ) : (
        <RejectedTable rejected={rejected} />
      )}
    </div>
  );
}
