"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@velora/data";
import { cn } from "@/lib/utils";

const TABS = [
  ["/", "Wealth"],
  ["/flow", "Flow"],
  ["/activity", "Activity"],
  ["/budgets", "Budgets"],
  ["/goals", "Goals"],
  ["/bills", "Bills"],
  ["/subscriptions", "Subscriptions"],
] as const;

export function Nav() {
  const path = usePathname();
  const { data: profile } = useProfile();
  const initial = profile?.display_name?.trim()[0]?.toUpperCase() ?? "";
  return (
    <nav aria-label="Main" className="glass enter sticky top-4 z-30 mx-auto flex w-fit max-w-[calc(100vw-24px)] items-center gap-1 overflow-x-auto rounded-full p-1.5">
      <Link href="/" className="flex items-center gap-2.5 pl-2 pr-4 font-serif text-2xl">
        <span className="size-7 rounded-full bg-[conic-gradient(from_0deg,#c99b5b,#7a5226,#f3dcb0,#7a5226,#c99b5b)] shadow-[0_0_16px_rgb(201_155_91/.45),inset_0_0_0_1px_rgb(255_255_255/.5)] motion-safe:animate-[spin_10s_linear_infinite]" aria-hidden />
        Velora
      </Link>
      {TABS.map(([href, label]) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2.5 text-sm text-muted transition hover:text-text",
              active && "bg-surface text-text shadow-[0_6px_18px_rgb(80_60_30/.15)]",
            )}
          >
            {label}
          </Link>
        );
      })}
      <Link
        href="/accounts"
        aria-label="Accounts and settings"
        className="ml-2 grid size-9 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe9c7,#b88449_60%,#3b2a17)] font-serif text-lg text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/.35)]"
      >
        {initial}
      </Link>
    </nav>
  );
}
