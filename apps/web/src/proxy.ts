import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const PUBLIC = ["/login", "/signup", "/auth", "/privacy", "/terms"];

/** Refreshes the Supabase session cookie and keeps signed-out users on the auth pages. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getClaims verifies the JWT; never trust an unverified cookie for routing decisions.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

  if (!signedIn && !isPublic) return redirectKeepingCookies(request, response, "/login");
  if (signedIn && (path === "/login" || path === "/signup")) return redirectKeepingCookies(request, response, "/");
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const res = NextResponse.redirect(new URL(to, request.url));
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
