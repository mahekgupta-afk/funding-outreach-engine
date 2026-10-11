import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveThesis } from "@/lib/dashboard-data";

export async function GET() {
  try {
    const thesis = await getActiveThesis();
    return NextResponse.json({ thesis });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

const PutSchema = z.object({
  accelerator_name: z.string().min(1),
  description: z.string().min(1),
  target_sectors: z.array(z.string()),
  excluded_sectors: z.array(z.string()),
  target_geographies: z.array(z.string()),
  stages: z.array(z.string()),
  min_round_usd: z.number().nullable(),
  max_round_usd: z.number().nullable(),
  fit_threshold: z.number().int().min(0).max(100),
  sender_name: z.string().nullable(),
  sender_title: z.string().nullable(),
  program_pitch: z.string().nullable(),
});

export async function PUT(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = PutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const current = await getActiveThesis();

    const { data, error } = await supabase
      .from("thesis")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", current.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ thesis: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
