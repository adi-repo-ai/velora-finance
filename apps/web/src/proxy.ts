import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const PUBLIC = ["/login", "/signup", "/forgot-password", "/auth", "/privacy", "/terms"];

/** Refreshes the Supabase session cookie and keeps signed-out users on the auth pages. */
export async function proxy(request: NextRequest) {
  // Supabase sends people to the Site URL (e.g. "/?code=…") when an email link's redirect isn't on
  // its allow-list. Finish the sign-in at the callback instead of leaving the code in the address bar.
  const params = request.nextUrl.searchParams;
  const path0 = request.nextUrl.pathname;
  if (!path0.startsWith("/auth/") && (params.has("code") || params.has("error_description"))) {
    const to = new URL(params.has("code") ? "/auth/callback" : "/login", request.url);
    if (params.has("code")) {
      to.searchParams.set("code", params.get("code")!);
      if (path0 !== "/") to.searchParams.set("next", path0);
    } else to.searchParams.set("error", "link");
    return NextResponse.redirect(to);
  }

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
