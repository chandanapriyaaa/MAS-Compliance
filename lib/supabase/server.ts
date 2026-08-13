import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Supabase client (RLS-scoped, cookie-bound) for server components,
 * route handlers, and server actions that act AS THE SIGNED-IN USER.
 *
 * This is distinct from `supabaseService()` in ../supabase.ts, which uses the
 * secret key and bypasses RLS for the agent pipeline. Use this one for
 * user-facing reads that must respect row-level security.
 */
export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` from a Server Component — safe to ignore when middleware
          // is responsible for refreshing sessions.
        }
      },
    },
  });
}
