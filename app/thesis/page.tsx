import { getActiveThesis } from "@/lib/dashboard-data";
import ThesisForm from "@/components/ThesisForm";
import RunNowButton from "@/components/RunNowButton";

export const dynamic = "force-dynamic";

export default async function ThesisPage() {
  const thesis = await getActiveThesis();

  return (
    <div className="container stack">
      <div className="pageHeader">
        <h1>Accelerator thesis</h1>
        <p>
          Edits here take effect on the very next pipeline run — no code change or redeploy
          needed. You can also edit this row directly in the Supabase Table Editor.
        </p>
      </div>

      <RunNowButton />
      <ThesisForm thesis={thesis} />
    </div>
  );
}
