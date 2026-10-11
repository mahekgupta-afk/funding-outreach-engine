import { NextResponse } from "next/server";
import { getRejected } from "@/lib/dashboard-data";

export async function GET() {
  try {
    const rejected = await getRejected();
    return NextResponse.json({ rejected });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
