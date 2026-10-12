import { getNewsItems } from "@/lib/dashboard-data";
import NewsFeed from "@/components/NewsFeed";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const items = await getNewsItems();

  return (
    <div className="container stack">
      <div className="pageHeader">
        <h1>News</h1>
        <p>
          Every pre-seed/seed funding announcement found across all sources — whether or not it
          fits the current thesis. For the ones being pursued, see the Email tab; for a wrong
          rejection you want to override, see System Rejected.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card emptyState">
          No pre-seed/seed announcements found yet. Trigger a run from the{" "}
          <a href="/thesis">Thesis</a> page, or check back after the next scheduled run.
        </div>
      ) : (
        <NewsFeed items={items} />
      )}
    </div>
  );
}
