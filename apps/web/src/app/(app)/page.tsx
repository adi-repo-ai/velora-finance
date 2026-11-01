"use client";

import { budgetStatus, formatCompact, formatMoney, monthKey, safeToSpendToday, splitCents } from "@velora/core";
import { useAccounts, useBills, useBudget, useCurrency, useGoals, useNetWorth } from "@velora/data";
import Link from "next/link";
import { useState } from "react";
import { HeroMoney } from "@/components/money";
import { NetWorthChart } from "@/components/net-worth-chart";
import { Orb } from "@/components/orb";
import { Rings } from "@/components/rings";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RANGES = [["6M", 6], ["1Y", 12], ["5Y", 60]] as const;

export default function WealthPage() {
  const currency = useCurrency();
  const [months, setMonths] = useState(12);
  const accounts = useAccounts();
  const history = useNetWorth(months);

  if (accounts.error) return <ErrorNote error={accounts.error} />;
  if (accounts.data && accounts.data.length === 0) {
    return (
      <section className="glass enter mx-auto max-w-xl">
        <Empty
          title="Let's map your money"
          body="Add a bank account, card or cash wallet with today's balance. Everything else — net worth, budgets, insights — builds from there."
          action={{ href: "/accounts", label: "Add your first account" }}
        />
      </section>
    );
  }

  const points = history.data ?? [];
  const now = points.at(-1)?.net_worth ?? 0;
  const delta = now - (points[0]?.net_worth ?? 0);
  const base = accounts.data?.filter((a) => a.currency === currency) ?? [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="glass enter flex min-h-[460px] flex-col p-8 sm:p-10" style={{ ["--i" as string]: 1 }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="label-mono">Total net worth · {currency} · {base.length} accounts</p>
            <div role="group" aria-label="Range" className="flex gap-1 rounded-full border border-line p-1">
              {RANGES.map(([label, m]) => (
                <button
                  key={label}
                  onClick={() => setMonths(m)}
                  aria-pressed={months === m}
                  className={cn("rounded-full px-3 py-1.5 font-mono text-[11px] text-faint", months === m && "bg-gradient-to-b from-gold-1 to-gold-2 text-on-gold")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {history.isPending ? (
            <Skeleton className="mt-6 h-28 w-2/3" />
          ) : (
            <HeroMoney minor={now} currency={currency} className="mt-5 block text-[clamp(64px,9vw,128px)] leading-[.9]" />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[15px] text-muted">
            <span className={cn("rounded-full border border-line bg-surface/50 px-3 py-1 font-mono text-xs", delta >= 0 ? "text-positive" : "text-negative")}>
              {delta >= 0 ? "▲" : "▼"} {formatMoney(Math.abs(delta), currency, { cents: true })}
            </span>
            <span>past {RANGES.find(([, m]) => m === months)?.[0]}</span>
          </div>
          <div className="mt-6 min-h-[220px] flex-1">{points.length > 1 && <NetWorthChart data={points} currency={currency} />}</div>
        </section>
        <Vault />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <GoalTile />
        <AllocationTile />
        <NextBillTile />
        <SafeToSpendTile />
      </div>
    </div>
  );
}

const CARD_FINISH = [
  "bg-[linear-gradient(135deg,#2c2c33,#0b0b0e_55%,#1d1d22)] text-[#e9e2d2]",
  "bg-[conic-gradient(from_140deg_at_30%_40%,#ffd3f1,#c6f4ff,#d6ffd9,#fff2b8,#e3c9ff,#ffd3f1)] text-[#2b2340]",
  "bg-[linear-gradient(130deg,#fbe8bf,#c69655_45%,#f3d9a2_72%,#9c6f37)] text-[#3a2610]",
];

function Vault() {
  const currency = useCurrency();
  const { data: accounts = [] } = useAccounts();
  const assets = accounts.filter((a) => a.currency === currency && a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const owed = accounts.filter((a) => a.currency === currency && a.balance < 0).reduce((s, a) => s + a.balance, 0);
  const top = accounts.slice(0, 3);
  return (
    <section className="glass enter flex min-h-[460px] flex-col overflow-hidden p-8" style={{ ["--i" as string]: 2 }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-mono">The vault</p>
          <h2 className="mt-1.5 font-serif text-[34px] leading-tight">
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"}, <em className="text-gold-2">one view.</em>
          </h2>
        </div>
        <Button variant="glass" size="sm" asChild><Link href="/accounts#accounts">{accounts.length > 3 ? `See all ${accounts.length}` : "Manage"}</Link></Button>
      </div>
      <div className="relative flex-1 [perspective:1500px]" aria-hidden>
        <div className="absolute left-1/2 top-[60%] h-28 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(90_60_20/.3),transparent)] blur-xl" />
        <div className="absolute left-1/2 top-[46%] h-[200px] w-[316px] max-sm:scale-[.72] [transform:translate(-50%,-50%)_rotateX(56deg)_rotateZ(-34deg)] [transform-style:preserve-3d]">
          {[...top].reverse().map((a, i) => (
            <div
              key={a.id}
              className={cn("absolute inset-0 flex flex-col justify-between rounded-[18px] p-5 font-mono text-xs tracking-[.12em] shadow-[0_30px_50px_-10px_rgb(0_0_0/.45),inset_0_1px_0_rgb(255_255_255/.35)] motion-safe:animate-[float_6s_ease-in-out_infinite]", CARD_FINISH[top.length - 1 - i])}
              style={{ transform: `translateZ(${i * 46}px)`, animationDelay: `${i * -0.4}s`, ["--z" as string]: `${i * 46}px` }}
            >
              <div className="flex justify-between"><span className="font-serif text-xl tracking-normal normal-case">Velora</span><span className="text-[10px] uppercase opacity-70">{a.type}</span></div>
              <div className="h-8 w-11 rounded-md bg-gradient-to-br from-[#f6dda8] to-[#b98a4c]" />
              <div className="flex justify-between uppercase"><span>•••• {a.mask ?? "0000"}</span><span className="text-[10px]">{a.name.slice(0, 18)}</span></div>
            </div>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {[["Assets", formatCompact(assets, currency)], ["Owed", formatCompact(-owed, currency)], ["Accounts", String(accounts.length)]].map(([k, v]) => (
          <div key={k}><dt className="label-mono">{k}</dt><dd className="mt-1 font-serif text-2xl">{v}</dd></div>
        ))}
      </dl>
    </section>
  );
}

function Tile({ i, children, className }: { i: number; children: React.ReactNode; className?: string }) {
  return <section className={cn("glass enter flex min-h-[226px] flex-col p-6", className)} style={{ ["--i" as string]: i }}>{children}</section>;
}

function GoalTile() {
  const { data: goals = [] } = useGoals();
  const g = goals[0];
  if (!g) return <Tile i={3}><p className="label-mono">Goals</p><Empty title="Save for something" body="Trips, a cushion, a home." action={{ href: "/goals", label: "New goal" }} /></Tile>;
  const pct = g.saved_amount / g.target_amount;
  return (
    <Tile i={3} className="flex-row items-center gap-5">
      <Orb size={150} pct={pct}><span className="font-serif text-4xl">{Math.round(pct * 100)}%</span></Orb>
      <div className="min-w-0">
        <p className="label-mono">{g.emoji} {g.name}</p>
        <p className="mt-2 font-serif text-4xl">{formatCompact(g.saved_amount, g.currency)}</p>
        <p className="mt-1 text-[13px] text-muted">of {formatMoney(g.target_amount, g.currency)}</p>
        <Link href="/goals" className="mt-3 inline-block text-sm font-medium text-gold-2 hover:underline">{goals.length > 1 ? `See all ${goals.length} goals →` : "Open goals →"}</Link>
      </div>
    </Tile>
  );
}

function AllocationTile() {
  const currency = useCurrency();
  const { data: accounts = [] } = useAccounts();
  const pos = accounts.filter((a) => a.currency === currency && a.balance > 0);
  const total = pos.reduce((s, a) => s + a.balance, 0) || 1;
  const share = (types: string[]) => pos.filter((a) => types.includes(a.type)).reduce((s, a) => s + a.balance, 0) / total;
  const parts = [
    ["Investments", share(["investment"]), "gold-1"],
    ["Cash & bank", share(["checking", "savings", "cash", "wallet"]), "sky"],
    ["Other", share(["credit", "loan"]), "lilac"],
  ] as const;
  return (
    <Tile i={4} className="flex-row items-center gap-5">
      <Rings size={140} parts={parts.map(([, v, c]) => [v, c])} label="Asset allocation" />
      <div className="grid gap-2 text-[13px]">
        <p className="label-mono">Allocation</p>
        {parts.map(([n, v, c]) => (
          <p key={n}><i className="mr-2 inline-block size-2 rounded-full" style={{ background: `rgb(var(--${c}))` }} />{n} <span className="text-faint">{Math.round(v * 100)}%</span></p>
        ))}
      </div>
    </Tile>
  );
}

function NextBillTile() {
  const { data: bills = [] } = useBills();
  const b = bills[0];
  if (!b) return <Tile i={5}><p className="label-mono">Next up</p><Empty title="No bills yet" body="Get reminded before rent and cards are due." action={{ href: "/bills", label: "Add a bill" }} /></Tile>;
  const days = Math.ceil((new Date(`${b.next_due_on}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
  const { whole, cents } = splitCents(b.amount, b.currency);
  return (
    <Tile i={5}>
      <p className="label-mono">Next up · {days <= 0 ? "due today" : `in ${days} day${days === 1 ? "" : "s"}`}</p>
      <p className="mt-2 font-serif text-5xl leading-none">{whole}<em className="text-2xl text-gold-2">{cents}</em></p>
      <p className="mt-2 text-sm">{b.name}</p>
      <div className="mt-auto flex justify-between pt-4 label-mono"><span>{b.autopay ? "Autopay on" : "Manual"}</span><Link href="/bills" className="hover:text-text">See all {bills.length} →</Link></div>
    </Tile>
  );
}

function SafeToSpendTile() {
  const currency = useCurrency();
  const { data: lines = [] } = useBudget(monthKey());
  const { data: bills = [] } = useBills();
  const remaining = lines.reduce((s, l) => s + Math.max(budgetStatus(l).remaining, 0), 0);
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
  const billsDue = bills.filter((b) => b.currency === currency && b.next_due_on <= end && !b.autopay).reduce((s, b) => s + b.amount, 0);
  const safe = safeToSpendToday({ remainingBudget: remaining, billsDue });
  const { whole, cents } = splitCents(safe, currency);
  return (
    <Tile i={6}>
      <p className="label-mono">Safe to spend today</p>
      {lines.length ? (
        <>
          <p className="mt-2 font-serif text-5xl leading-none">{whole}<em className="text-2xl text-gold-2">{cents}</em></p>
          <p className="mt-2 text-sm leading-relaxed text-muted">What&rsquo;s left in this month&rsquo;s budgets after upcoming bills, spread over the remaining days.</p>
        </>
      ) : (
        <Empty title="Set a budget" body="We'll work out a daily number for you." action={{ href: "/budgets", label: "Create budget" }} />
      )}
    </Tile>
  );
}
