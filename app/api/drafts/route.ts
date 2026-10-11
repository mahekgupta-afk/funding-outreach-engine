import { NextResponse } from "next/server";
import { getPendingDrafts } from "@/lib/dashboard-data";

export async function GET() {
  try {
    const drafts = await getPendingDrafts();
    return NextResponse.json({ drafts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
