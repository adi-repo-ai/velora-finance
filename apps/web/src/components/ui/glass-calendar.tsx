"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => new Date(`${s}T00:00:00`);
const addDays = (s: string, n: number) => { const d = fromIso(s); d.setDate(d.getDate() + n); return toIso(d); };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Frosted month calendar. Pick a day with the mouse or the keyboard (arrows move, PageUp/PageDown change month,
 * Enter selects). `markers` draws small content under a day, e.g. logos of what renews then.
 */
export function GlassCalendar({
  value, onSelect, markers, min, className,
}: {
  value?: string | null;
  onSelect?: (iso: string) => void;
  markers?: (iso: string) => ReactNode;
  min?: string;
  className?: string;
}) {
  const today = toIso(new Date());
  const [focus, setFocus] = useState(value || today);
  const [month, setMonth] = useState((value || today).slice(0, 7));
  const grid = useRef<HTMLDivElement>(null);

  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(y, m - 1, 1);
  const start = addDays(toIso(first), -first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const label = first.toLocaleDateString("en", { month: "long" });

  function shiftMonth(n: number) {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(toIso(d).slice(0, 7));
  }

  function moveFocus(next: string) {
    setFocus(next);
    setMonth(next.slice(0, 7));
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  }

  function onKey(e: KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) { e.preventDefault(); moveFocus(addDays(focus, step)); }
    if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const d = fromIso(focus);
      d.setMonth(d.getMonth() + (e.key === "PageUp" ? -1 : 1));
      moveFocus(toIso(d));
    }
  }

  return (
    <div className={cn("glass relative overflow-hidden rounded-[28px] p-5", className)}>
      {/* soft gold light behind the glass */}
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(201_155_91/.35),transparent)]" aria-hidden />
      <div className="relative flex items-center justify-between gap-2">
        <p className="font-serif text-3xl leading-none" aria-live="polite">
          {label} <span className="font-mono text-sm tracking-widest text-muted">{y}</span>
        </p>
        <div className="flex items-center gap-1">
          {month !== today.slice(0, 7) && (
            <button type="button" onClick={() => moveFocus(today)} className="mr-1 rounded-full bg-surface/70 px-3 py-1.5 text-xs font-medium shadow-[0_4px_12px_rgb(80_60_30/.12)] hover:bg-surface">Today</button>
          )}
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface/70 hover:text-text"><ChevronLeft className="size-4" /></button>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface/70 hover:text-text"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-7 text-center" aria-hidden>
        {WEEKDAYS.map((d) => <span key={d} className="label-mono pb-2 text-[10px]">{d}</span>)}
      </div>
      <div key={month} ref={grid} role="grid" aria-label={`${label} ${y}`} onKeyDown={onKey} className="relative grid grid-cols-7 gap-1 animate-[fadein_.25s_ease]">
        {days.map((d) => {
          const inMonth = d.slice(0, 7) === month;
          const selected = d === value;
          const disabled = !!min && d < min;
          const mark = markers?.(d);
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              data-date={d}
              tabIndex={d === focus ? 0 : -1}
              disabled={disabled}
              aria-selected={selected}
              aria-current={d === today ? "date" : undefined}
              aria-label={fromIso(d).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              onClick={() => { setFocus(d); onSelect?.(d); }}
              className={cn(
                "group relative flex min-h-11 flex-col items-center justify-start gap-0.5 rounded-2xl pb-1 pt-1.5 text-sm transition",
                "hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-gold-1 disabled:pointer-events-none disabled:opacity-30",
                !inMonth && "text-faint",
                d === today && !selected && "shadow-[inset_0_0_0_1.5px_rgb(201_155_91)]",
                selected && "bg-gradient-to-b from-gold-1 to-gold-2 font-semibold text-on-gold shadow-[0_10px_24px_-10px_rgb(122_82_38/.8)] hover:bg-gradient-to-b",
              )}
            >
              <span className="leading-none">{Number(d.slice(8))}</span>
              {mark && <span className="flex min-h-4 items-center justify-center">{mark}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
