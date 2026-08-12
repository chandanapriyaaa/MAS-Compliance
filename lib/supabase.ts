import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * This BYPASSES row-level security — only import from server code
 * (API routes, agent functions, scripts). Never ship it to the browser.
 */
let _service: SupabaseClient | null = null;

export function supabaseService(): SupabaseClient {
  if (_service) return _service;
  _service = createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _service;
}

/**
 * Anon client for browser use (subject to RLS). Reads public env vars.
 */
export function supabaseBrowser(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.",
    );
  }
  return createClient(url, anon);
}
