import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceRoleKey =
    serviceRoleKey && serviceRoleKey !== "your-service-role-key";

  if (!hasServiceRoleKey) {
    console.warn(
      "[supabase/server] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to anon key. Set it in .env.local for production."
    );
  }

  const key = hasServiceRoleKey
    ? serviceRoleKey
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}
