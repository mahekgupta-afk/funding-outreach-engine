"use server";

import { revalidatePath } from "next/cache";
import { runPipeline, type RunSummary } from "@/lib/pipeline";

/**
 * Server action backing the dashboard's "Run now" button. Runs on the server,
 * so CRON_SECRET is never exposed to the browser — this is a separate,
 * equally-authorized way to trigger the same pipeline as /api/run.
 */
export async function runPipelineAction(): Promise<RunSummary> {
  const summary = await runPipeline();
  revalidatePath("/news");
  revalidatePath("/email");
  revalidatePath("/runs");
  revalidatePath("/rejected");
  return summary;
}
