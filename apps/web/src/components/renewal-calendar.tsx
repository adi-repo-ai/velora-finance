"use client";

import { formatMoney, occurrencesInMonth } from "@velora/core";
import type { Tables } from "@velora/schemas";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { GlassCalendar, toIso } from "@/components/ui/glass-calendar";

type Item = Tables<"recurring_items">;

/** Month view of when bills or subscriptions fall due, with the chosen day's list beside it. */
export function RenewalCalendar({ items, title = "Calendar" }: { items: Item[]; title?: string }) {
  const [day, setDay] = useState(() => toIso(new Date()));
  // shortcut: recomputes per day cell (42 × items); fine for personal-sized lists, memoise per month if it grows.
  const on = (iso: string) => items.filter((it) => occurrencesInMonth(it.next_due_on, it.cadence, iso.slice(0, 7)).includes(iso));
  const due = on(day);
  const totals = Map.groupBy(due, (i) => i.currency);

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <GlassCalendar
        value={day}
        onSelect={setDay}
        markers={(iso) => {
          const list = on(iso);
          if (!list.length) return null;
          return (
            <span className="flex items-center -space-x-1.5">
              {list.slice(0, 2).map((i) => <BrandLogo key={i.id} name={i.name} domain={i.website} src={i.logo} className="size-4 rounded-full shadow-[0_0_0_1.5px_rgb(255_255_255/.9)]" />)}
              {list.length > 2 && <span className="pl-2 text-[9px] font-semibold">+{list.length - 2}</span>}
            </span>
          );
        }}
      />
      <div className="glass rounded-[28px] p-6">
        <p className="label-mono">{title}</p>
        <p className="mt-2 font-serif text-3xl leading-tight">{new Date(`${day}T00:00:00`).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}</p>
        {due.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Nothing due this day.</p>
        ) : (
          <>
            <ul className="mt-4 grid gap-1">
              {due.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface/50">
                  <BrandLogo name={i.name} domain={i.website} src={i.logo} className="size-10 rounded-xl" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.name}</span><span className="text-xs capitalize text-muted">{i.kind} · {i.cadence}{i.autopay ? " · auto" : " · pay manually"}</span></span>
                  <span className="font-serif text-xl">{formatMoney(i.amount, i.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-right text-sm text-muted">
              Total {[...totals].map(([c, rows]) => formatMoney(rows.reduce((s, r) => s + r.amount, 0), c)).join(" + ")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
