import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Only same-site paths, so the link can't be turned into a redirect to another website. */
const safeNext = (next: string | null) => (next && /^\/(?![/\\])/.test(next) ? next : "/");

/** Email confirmation, password reset and Google/GitHub landing: swaps the one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url));
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
