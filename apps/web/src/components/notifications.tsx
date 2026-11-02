"use client";

import { formatMoney } from "@velora/core";
import { useBills } from "@velora/data";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const SEEN_KEY = "velora-reminders-seen";
const keyOf = (b: { id: string; next_due_on: string }) => `${b.id}:${b.next_due_on}`;
function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]); } catch { return new Set(); }
}

const daysUntil = (iso: string) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);

/** Bell with everything overdue or due within a week (bills and subscriptions with reminders on). */
export function Notifications() {
  const { data = [] } = useBills();
  const items = data.filter((b) => b.notify && daysUntil(b.next_due_on) <= 7);
  // Each reminder is keyed by item + due date, so a new cycle or a new bill shows up as unseen again.
  const [seen, setSeen] = useState<Set<string>>(readSeen);
  const unseen = items.filter((b) => !seen.has(keyOf(b)));
  const urgent = unseen.filter((b) => daysUntil(b.next_due_on) <= 1).length;
  function markSeen(open: boolean) {
    if (!open || unseen.length === 0) return;
    const next = new Set(items.map(keyOf)); // drop keys for items no longer due, so storage stays small
    setSeen(next);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...next])); } catch { /* storage blocked: badge just won't persist */ }
  }
  return (
    <Popover.Root onOpenChange={markSeen}>
      <Popover.Trigger
        aria-label={`Reminders: ${items.length} due this week${unseen.length ? `, ${unseen.length} new` : ""}`}
        className="relative grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface/70 hover:text-text"
      >
        <Bell className="size-[18px]" aria-hidden />
        {unseen.length > 0 && (
          <span className={cn("absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold leading-4 text-white", urgent ? "bg-negative" : "bg-gold-2")}>{unseen.length}</span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="glass z-50 w-[min(360px,calc(100vw-24px))] rounded-[24px] p-4 outline-none data-[state=open]:animate-[fadein_.15s_ease]">
          <p className="label-mono px-2">Due this week</p>
          {items.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">You’re all caught up.</p>}
          <ul className="mt-2 grid gap-1">
            {items.map((b) => {
              const d = daysUntil(b.next_due_on);
              return (
                <li key={b.id}>
                  <Popover.Close asChild>
                    <Link href={b.kind === "subscription" ? "/subscriptions" : "/bills"} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface/70">
                      <BrandLogo name={b.name} domain={b.website} src={b.logo} className="size-9 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{b.name}</span>
                        <span className={cn("text-xs text-muted", d < 0 && "text-negative", d >= 0 && d <= 1 && "text-gold-2")}>
                          {d < 0 ? `${-d} ${d === -1 ? "day" : "days"} overdue` : d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : `In ${d} days`} · {b.kind}
                        </span>
                      </span>
                      <span className="font-serif text-lg">{formatMoney(b.amount, b.currency)}</span>
                    </Link>
                  </Popover.Close>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex justify-between border-t border-line px-2 pt-3 text-sm">
            <Popover.Close asChild><Link href="/bills" className="font-medium text-gold-2 hover:underline">See all bills</Link></Popover.Close>
            <Popover.Close asChild><Link href="/subscriptions" className="font-medium text-gold-2 hover:underline">See all subscriptions</Link></Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
