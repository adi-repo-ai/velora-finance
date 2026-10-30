import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@velora/schemas";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabase() {
  return (client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY));
}
