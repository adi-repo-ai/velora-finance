import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@velora/schemas";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => toSet.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
}
