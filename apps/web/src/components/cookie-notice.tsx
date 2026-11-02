"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const NAME = "velora-cookies";
const noop = () => () => {};

/** Velora only sets essential cookies (sign-in), so this informs rather than asks for consent. */
export function CookieNotice() {
  const seen = useSyncExternalStore(noop, () => document.cookie.includes(`${NAME}=ok`), () => true);
  const [closed, setClosed] = useState(false);
  if (seen || closed) return null;

  function accept() {
    document.cookie = `${NAME}=ok; path=/; max-age=${365 * 86_400}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setClosed(true);
  }

  return (
    <div role="region" aria-label="Cookie notice" className="glass fixed inset-x-3 bottom-3 z-40 flex flex-wrap items-center gap-3 rounded-[22px] p-4 text-sm sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-sm">
      <Cookie className="size-5 shrink-0 text-gold-2" aria-hidden />
      <p className="min-w-0 flex-1 text-muted">We use only essential cookies to keep you signed in and secure. No ads, no tracking. <Link href="/privacy" className="font-medium text-gold-2 hover:underline">Privacy policy</Link></p>
      <Button size="sm" onClick={accept}>Got it</Button>
    </div>
  );
}
