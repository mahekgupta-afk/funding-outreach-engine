import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const PatchSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  to_email: z.string().email().nullable().optional(),
  status: z.enum(["pending_review", "approved", "sent", "discarded"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: draft, error } = await supabase
    .from("drafts")
    .update({
      ...updates,
      ...(updates.status ? { reviewed_at: new Date().toISOString() } : {}),
    })
    .eq("id", id)
    .select("*, startups(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Marking a draft sent means outreach actually happened — reflect it on the startup.
  // The draft is only ever marked "sent" by Rohit from the dashboard; the server never does this itself.
  if (updates.status === "sent" && draft) {
    await supabase.from("startups").update({ status: "contacted" }).eq("id", draft.startup_id);
  }

  return NextResponse.json({ draft });
}
