import { getAllDrafts } from "@/lib/dashboard-data";
import EmailTabs from "@/components/EmailTabs";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  const drafts = await getAllDrafts();
  const pendingCount = drafts.filter((d) => d.status === "pending_review").length;

  return (
    <div className="container">
      <div className="pageHeader">
        <h1>Email</h1>
        <p>
          {pendingCount === 0
            ? "No drafts waiting for review."
            : `${pendingCount} draft${pendingCount === 1 ? "" : "s"} waiting for review.`}{" "}
          Nothing here is ever sent automatically — review, edit, and send yourself.
        </p>
      </div>

      <EmailTabs drafts={drafts} />
    </div>
  );
}
