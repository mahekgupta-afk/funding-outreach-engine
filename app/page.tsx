import { getPendingDrafts } from "@/lib/dashboard-data";
import DraftCard from "@/components/DraftCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const drafts = await getPendingDrafts();

  return (
    <div className="container">
      <div className="pageHeader">
        <h1>Today&apos;s drafts</h1>
        <p>
          {drafts.length === 0
            ? "No drafts waiting for review."
            : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} waiting for review.`}{" "}
          Nothing here is ever sent automatically — review, edit, and send yourself.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="card emptyState">
          No pending drafts right now. Check back after the next scheduled run, or trigger one
          from the <a href="/thesis">Thesis</a> page.
        </div>
      ) : (
        <div className="stack">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
    </div>
  );
}
