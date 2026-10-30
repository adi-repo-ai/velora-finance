"use client";

import { monthKey } from "@velora/core";

export function shiftMonth(month: string, by: number) {
  const d = new Date(`${month}T00:00:00`);
  d.setMonth(d.getMonth() + by);
  return monthKey(d);
}

export const monthName = (month: string, opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }) =>
  new Date(`${month}T00:00:00`).toLocaleString("en", opts);

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month === monthKey();
  return (
    <div className="flex w-fit items-center gap-1 rounded-full border border-line bg-white/40 p-1 text-sm">
      <button className="grid size-8 place-items-center rounded-full hover:bg-white" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
      <span className="min-w-32 text-center font-medium">{monthName(month)}</span>
      <button className="grid size-8 place-items-center rounded-full hover:bg-white disabled:opacity-30" disabled={isCurrent} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">›</button>
    </div>
  );
}
