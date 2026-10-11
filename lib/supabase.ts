import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

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
    // Node (< 22) has no native WebSocket; supabase-js's realtime client
    // throws at construction time without one, even though this app never
    // uses realtime subscriptions.
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });
}
