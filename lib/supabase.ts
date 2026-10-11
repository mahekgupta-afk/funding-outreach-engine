import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key. This bypasses RLS,
 * so it must never be imported into client components or exposed to the browser.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
