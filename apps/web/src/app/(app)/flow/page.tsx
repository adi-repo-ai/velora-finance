"use client";

import { budgetStatus, formatMoney, monthKey } from "@velora/core";
import { useBills, useBudget, useCurrency, useMonthSummary, useTransactions } from "@velora/data";
import { useState } from "react";
import { CashFlowSankey } from "@/components/cash-flow-sankey";
import { MonthSwitcher, monthName } from "@/components/month-switcher";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { cn } from "@/lib/utils";

export default function FlowPage() {
  const [month, setMonth] = useState(monthKey());
  const currency = useCurrency();
  const summary = useMonthSummary(month);
  const s = summary.data;
  const income = (s?.rows ?? []).filter((r) => r.total > 0).map((r) => ({ ...r, total: r.total }));
  const spending = (s?.rows ?? []).filter((r) => r.total < 0 && r.kind === "expense").map((r) => ({ ...r, total: -r.total }));
  const rate = s && s.income > 0 ? (s.net / s.income) * 100 : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.75fr_1fr]">
      <section className="glass enter flex min-h-[640px] flex-col p-8 sm:p-10" style={{ ["--i" as string]: 1 }}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="label-mono">Cash flow</p>
            <h1 className="mt-3 font-serif text-[clamp(44px,5vw,64px)] leading-none">
              Where {monthName(month, { month: "long" })} <em className="text-gold-2">went.</em>
            </h1>
            <div className="mt-4"><MonthSwitcher month={month} onChange={setMonth} /></div>
          </div>
          {s && (
            <div className="text-right">
              <p className="label-mono">Net this month</p>
              <p className={cn("mt-2 font-serif text-5xl leading-none", s.net >= 0 ? "text-positive" : "text-negative")}>{formatMoney(s.net, currency, { sign: true })}</p>
              {rate !== null && <p className="mt-1 text-[13px] text-muted">{rate.toFixed(1)}% savings rate</p>}
            </div>
          )}
        </div>
        <div className="mt-6 min-h-[420px] flex-1">
          {summary.error ? <ErrorNote error={summary.error} /> : summary.isPending ? <Skeleton className="h-full w-full" /> : income.length + spending.length === 0 ? (
            <Empty title="Nothing here yet" body="Add or import transactions to see where your money flows." action={{ href: "/activity", label: "Add transactions" }} />
          ) : (
            <CashFlowSankey income={income} spending={spending} currency={currency} />
          )}
        </div>
      </section>
      <div className="grid content-start gap-6">
        <HeatCalendar month={month} />
        <Noticed month={month} />
      </div>
    </div>
  );
}

function HeatCalendar({ month }: { month: string }) {
  const currency = useCurrency();
  const { data: txns = [] } = useTransactions(month);
  const first = new Date(`${month}T00:00:00`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // weeks start Monday
  const spend = Array.from({ length: days }, () => 0);
  for (const t of txns) if (t.amount < 0 && t.account?.currency === currency) spend[Number(t.posted_on.slice(8, 10)) - 1]! -= t.amount;
  const max = Math.max(...spend, 1);
  const peak = spend.indexOf(Math.max(...spend));
  return (
    <section className="glass enter p-7" style={{ ["--i" as string]: 2 }}>
      <div className="flex justify-between"><p className="label-mono">Daily spend heat</p><p className="label-mono">{monthName(month, { month: "short" })}</p></div>
      <div className="mt-4 grid grid-cols-7 gap-1.5" role="img" aria-label="Spending by day of month">
        {Array.from({ length: lead }, (_, i) => <i key={`l${i}`} />)}
        {spend.map((v, d) => (
          <i
            key={d}
            title={`${d + 1}: ${formatMoney(v, currency)}`}
            className="aspect-square rounded-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/.4)] motion-safe:animate-[fadein_.8s_ease_both]"
            style={{ background: `rgb(196 147 79 / ${0.06 + (v / max) * 0.8})`, animationDelay: `${0.3 + d * 0.018}s` }}
          />
        ))}
      </div>
      {spend[peak]! > 0 && <p className="mt-3 text-xs text-faint">Peak · {peak + 1} {monthName(month, { month: "short" })} · {formatMoney(spend[peak]!, currency)}</p>}
    </section>
  );
}

/** Rule-based observations from the user's own data. */
function Noticed({ month }: { month: string }) {
  const currency = useCurrency();
  const { data: lines = [] } = useBudget(month);
  const { data: s } = useMonthSummary(month);
  const { data: bills = [] } = useBills();
  const [soonCutoff] = useState(() => new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));
  const notes: [string, string][] = [];
  for (const l of lines) {
    const st = budgetStatus(l);
    if (st.state === "over") notes.push([`${l.name} is over budget`, `by ${formatMoney(-st.remaining, currency)} this month.`]);
    else if (st.state === "near") notes.push([`${l.name} is at ${Math.round(st.ratio * 100)}%`, `${formatMoney(st.remaining, currency)} left to spend.`]);
  }
  const top = s?.rows.find((r) => r.total < 0 && r.kind === "expense");
  if (top && s && s.spent > 0) notes.push([`${top.name} leads your spending`, `${Math.round((-top.total / s.spent) * 100)}% of everything spent this month.`]);
  const soon = bills.find((b) => b.next_due_on <= soonCutoff);
  if (soon) notes.push([`${soon.name} is due soon`, `${formatMoney(soon.amount, soon.currency)} on ${new Date(`${soon.next_due_on}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}.`]);
  return (
    <section className="glass enter p-7" style={{ ["--i" as string]: 3 }}>
      <h2 className="flex items-center gap-2.5 font-serif text-3xl">
        <span className="size-5 rounded-full bg-[conic-gradient(#c99b5b,#7a5226,#f3dcb0,#c99b5b)]" aria-hidden /> Velora <em className="text-gold-2">noticed</em>
      </h2>
      <ul className="mt-4">
        {notes.length === 0 && <li className="border-t border-line py-4 text-sm text-muted">All calm. Nothing needs your attention right now.</li>}
        {notes.slice(0, 4).map(([b, rest]) => (
          <li key={b} className="flex gap-3.5 border-t border-line py-3.5 text-sm leading-relaxed text-muted">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gold-1/15 text-gold-2" aria-hidden>✦</span>
            <span><b className="font-semibold text-text">{b}</b> {rest}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
