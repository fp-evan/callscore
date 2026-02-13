import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-key"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}
