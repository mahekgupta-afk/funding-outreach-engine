import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export const maxDuration = 300; // seconds — Vercel Hobby's ceiling for a function

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return Boolean(process.env.CRON_SECRET) && authHeader === expected;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runPipeline();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// GitHub Actions (every 2h) calls this with POST.
export async function POST(req: NextRequest) {
  return handle(req);
}

// Vercel's own cron (vercel.json, once/day fallback on the Hobby plan) always
// calls via GET, and automatically sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  return handle(req);
}
