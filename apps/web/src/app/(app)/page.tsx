"use client";

import { formatMoney, monthKey } from "@velora/core";
import { useAccounts, useBills, useBudget, useCurrency, useGoals, useMarkBillPaid, useMonthSummary, useProfile, useTransactions } from "@velora/data";
import { ArrowRight, Check, CircleDashed, FileUp, Plus, Repeat } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CubeLoader } from "@/components/cube-loader";
import { HeroMoney, Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { useSafeToSpend } from "@/components/use-safe-to-spend";
import { cn } from "@/lib/utils";

const noop = () => () => {};
const daysUntil = (iso: string) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
const greeting = () => { const h = new Date().getHours(); return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

/** Pulse: the first screen after sign-in. What you can spend today, what's due, and how the month is going. */
export default function PulsePage() {
  // Greeting, date and data are all client-side; render after hydration so the server and first paint agree.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  if (!hydrated) return <CubeLoader label="Taking your pulse" className="min-h-[60vh]" />;
  return <Pulse />;
}

function Pulse() {
  const { data: profile } = useProfile();
  const accounts = useAccounts();
  const firstName = profile?.display_name?.trim().split(/\s+/)[0];
  const date = new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="grid gap-6">
      <section className="glass enter grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-end" style={{ ["--i" as string]: 1 }}>
        <div>
          <p className="label-mono">{date}</p>
          <h1 className="mt-3 font-serif text-[clamp(44px,5.5vw,72px)] leading-[0.95]">
            {greeting()}{firstName ? <>, <em className="text-gold-2">{firstName}.</em></> : "."}
          </h1>
          <p className="mt-3 max-w-md text-muted">Here’s the pulse of your money today.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild><Link href="/activity"><Plus className="size-4" aria-hidden />Add transaction</Link></Button>
            <Button asChild variant="glass"><Link href="/activity"><FileUp className="size-4" aria-hidden />Import statement</Link></Button>
            <Button asChild variant="glass"><Link href="/subscriptions"><Repeat className="size-4" aria-hidden />Add subscription</Link></Button>
          </div>
        </div>
        <SafeToSpend />
      </section>

      {accounts.data?.length === 0 ? <GettingStarted /> : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <DueThisWeek />
            <ThisMonth />
            <Recent />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <NetWorth />
            <TopGoal />
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, link, i, children, className }: { title: string; link?: [string, string]; i: number; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass enter flex flex-col p-7", className)} style={{ ["--i" as string]: i }}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label-mono">{title}</h2>
        {link && <Link href={link[0]} className="flex items-center gap-1 text-sm font-medium text-gold-2 hover:underline">{link[1]}<ArrowRight className="size-3.5" aria-hidden /></Link>}
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function SafeToSpend() {
  const { safe, hasBudget, daysLeft, currency } = useSafeToSpend();
  return (
    <div className="rounded-[26px] bg-surface/55 p-6 shadow-[inset_0_0_0_1px_rgb(23_20_15/.05)]">
      <p className="label-mono">Safe to spend today</p>
      {hasBudget ? (
        <>
          <HeroMoney minor={safe} currency={currency} className="mt-3 text-[clamp(48px,6vw,76px)]" />
          <p className="mt-2 text-sm text-muted">Left in this month’s budgets after upcoming bills, spread over {daysLeft} {daysLeft === 1 ? "day" : "days"}.</p>
        </>
      ) : (
        <>
          <p className="mt-3 font-serif text-3xl leading-tight">Set a budget to get your daily number.</p>
          <Button asChild variant="glass" className="mt-4"><Link href="/plan#budgets">Create a budget</Link></Button>
        </>
      )}
    </div>
  );
}

function DueThisWeek() {
  const { data: items = [] } = useBills();
  const paid = useMarkBillPaid();
  const due = items.filter((b) => daysUntil(b.next_due_on) <= 7);
  return (
    <Card title="Due this week" link={["/bills", "All bills"]} i={2}>
      {due.length === 0 ? <p className="text-sm text-muted">Nothing due in the next 7 days. 🎉</p> : (
        <ul className="grid gap-1">
          {due.slice(0, 5).map((b) => {
            const d = daysUntil(b.next_due_on);
            return (
              <li key={b.id} className="flex items-center gap-3 rounded-2xl p-1.5">
                <BrandLogo name={b.name} domain={b.website} src={b.logo} className="size-9 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{b.name}</span>
                  <span className={cn("text-xs text-muted", d < 0 && "text-negative", d >= 0 && d <= 1 && "text-gold-2")}>{d < 0 ? `${-d}d overdue` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`}</span>
                </span>
                <span className="font-serif text-lg">{formatMoney(b.amount, b.currency)}</span>
                <button type="button" onClick={() => paid.mutate(b.id)} disabled={paid.isPending} aria-label={`Mark ${b.name} ${b.kind === "subscription" ? "renewed" : "paid"}`} title={b.kind === "subscription" ? "Mark renewed" : "Mark paid"}
                  className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-positive/10 hover:text-positive">
                  <Check className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {due.length > 5 && <p className="mt-2 text-xs text-muted">+{due.length - 5} more · <Link href="/subscriptions" className="text-gold-2 hover:underline">subscriptions</Link></p>}
    </Card>
  );
}

function ThisMonth() {
  const currency = useCurrency();
  const month = monthKey();
  const { data: s } = useMonthSummary(month);
  const { data: lines = [] } = useBudget(month);
  const budgeted = lines.reduce((t, l) => t + l.budgeted, 0);
  const spentInBudgets = lines.reduce((t, l) => t + l.spent, 0);
  const pct = budgeted ? Math.min(100, Math.round((spentInBudgets / budgeted) * 100)) : 0;
  const top = (s?.rows ?? []).filter((r) => r.total < 0 && r.kind === "expense").sort((a, b) => a.total - b.total)[0];
  return (
    <Card title={new Date().toLocaleDateString("en", { month: "long" }) + " so far"} link={["/activity", "Cash flow"]} i={3}>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-muted">Money in</p><Money minor={s?.income ?? 0} currency={currency} className="font-serif text-2xl text-positive" /></div>
        <div><p className="text-xs text-muted">Money out</p><Money minor={s?.spent ?? 0} currency={currency} className="font-serif text-2xl" /></div>
      </div>
      {budgeted > 0 ? (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-muted"><span>Budgets used</span><span>{pct}%</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-text/[.07]">
            <div className={cn("h-full rounded-full", pct >= 100 ? "bg-negative" : pct >= 85 ? "bg-gold-2" : "bg-gradient-to-r from-gold-1 to-gold-2")} style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">{formatMoney(spentInBudgets, currency)} of {formatMoney(budgeted, currency)}</p>
        </div>
      ) : <Link href="/plan#budgets" className="mt-5 text-sm font-medium text-gold-2 hover:underline">Set monthly budgets →</Link>}
      {top && <p className="mt-auto pt-4 text-sm"><span className="text-muted">Biggest category:</span> {top.icon} {top.name} · {formatMoney(-top.total, currency)}</p>}
    </Card>
  );
}

function Recent() {
  const { data: txns = [] } = useTransactions(monthKey());
  return (
    <Card title="Recent activity" link={["/activity", "See all"]} i={4}>
      {txns.length === 0 ? <p className="text-sm text-muted">No transactions this month yet.</p> : (
        <ul className="grid gap-2.5">
          {txns.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface/60 text-base" aria-hidden>{t.category?.icon ?? "•"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm">{t.merchant || t.description || t.category?.name || "Transaction"}</span><span className="text-xs text-muted">{new Date(`${t.posted_on}T00:00:00`).toLocaleDateString("en", { day: "numeric", month: "short" })}</span></span>
              <Money minor={t.amount} currency={t.account?.currency ?? "USD"} sign className={cn("text-sm font-medium", t.amount > 0 && "text-positive")} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NetWorth() {
  const currency = useCurrency();
  const { data: accounts = [] } = useAccounts();
  const mine = accounts.filter((a) => a.currency === currency);
  const total = mine.reduce((s, a) => s + a.balance, 0);
  return (
    <Card title="Net worth" link={["/wealth", "Wealth"]} i={5}>
      <HeroMoney minor={total} currency={currency} animate={false} className="text-5xl" />
      <p className="mt-2 text-sm text-muted">Across {mine.length} {currency} {mine.length === 1 ? "account" : "accounts"}.</p>
    </Card>
  );
}

function TopGoal() {
  const { data: goals = [] } = useGoals();
  const g = goals[0];
  if (!g) {
    return (
      <Card title="Goals" link={["/plan#goals", "Plan"]} i={6}>
        <p className="text-sm text-muted">Saving for a trip, a cushion or a home? Give it a target and watch it fill.</p>
        <Button asChild variant="glass" className="mt-4 w-fit"><Link href="/plan#goals">Create a goal</Link></Button>
      </Card>
    );
  }
  const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
  return (
    <Card title="Top goal" link={["/plan#goals", goals.length > 1 ? `All ${goals.length} goals` : "Plan"]} i={6}>
      <p className="font-serif text-3xl">{g.emoji} {g.name}</p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-text/[.07]"><div className="h-full rounded-full bg-gradient-to-r from-gold-1 to-gold-2" style={{ width: `${Math.max(pct, 2)}%` }} /></div>
      <p className="mt-2 text-sm text-muted">{formatMoney(g.saved_amount, g.currency)} of {formatMoney(g.target_amount, g.currency)} · {pct}%</p>
    </Card>
  );
}

/** Shown until the first account exists: the four steps that make Velora useful. */
function GettingStarted() {
  const { data: accounts = [] } = useAccounts();
  const { data: bills = [] } = useBills();
  const { data: lines = [] } = useBudget(monthKey());
  const steps: [string, string, string, boolean][] = [
    ["Add your main account", "Today’s balance is enough to start.", "/accounts#accounts", accounts.length > 0],
    ["Import a statement", "Excel or CSV from your bank; you review before saving.", "/activity", false],
    ["Set monthly budgets", "Unlocks your daily safe-to-spend number.", "/plan#budgets", lines.length > 0],
    ["Add bills & subscriptions", "Get reminded before anything renews.", "/subscriptions", bills.length > 0],
  ];
  return (
    <section className="glass enter p-8 sm:p-10" style={{ ["--i" as string]: 2 }}>
      <h2 className="font-serif text-4xl">Let’s set up your <em className="text-gold-2">vault.</em></h2>
      <ol className="mt-6 grid gap-3 md:grid-cols-2">
        {steps.map(([title, body, href, done], n) => (
          <li key={title}>
            <Link href={href} className="flex items-start gap-4 rounded-3xl bg-surface/50 p-5 transition hover:bg-surface/80">
              {done ? <Check className="mt-0.5 size-5 shrink-0 text-positive" aria-label="Done" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-gold-2" aria-hidden />}
              <span><span className="font-medium">{n + 1}. {title}</span><span className="mt-1 block text-sm text-muted">{body}</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
