"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (RLS-scoped) for use in client components — auth,
 * realtime subscriptions, etc. Uses the publishable key.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, key);
}
