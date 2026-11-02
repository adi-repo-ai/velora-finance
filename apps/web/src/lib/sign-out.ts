import { endSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Signs out of this device: ends the Supabase session, deletes its cookies and Velora's session markers,
 * then does a full page load of the sign-in page so no cached data from this account stays in memory.
 */
export async function signOut(reason?: "idle" | "closed") {
  endSession();
  try {
    await getSupabase().auth.signOut({ scope: "local" }); // this device only; other devices stay signed in
  } catch {
    // offline or server error: the cookie cleanup below still signs this browser out
  }
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0]!;
    if (name.startsWith("sb-")) document.cookie = `${name}=; path=/; max-age=0`;
  }
  try {
    sessionStorage.clear();
    localStorage.removeItem("velora-reminders-seen"); // per-account; the cookie-notice choice is kept
  } catch { /* storage blocked */ }
  location.replace(reason ? `/login?reason=${reason}` : "/login");
}
