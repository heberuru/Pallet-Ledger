import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Used ONLY by the Stripe webhook route. This bypasses row-level security,
// so it must never be imported into anything that runs in the browser or
// that isn't verifying a Stripe signature first.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
