"use client";

import { budgetStatus, daysLeftInMonth, formatMoney, monthKey } from "@velora/core";
import { useBudget, useCategories, useCurrency, useSetBudgetLine } from "@velora/data";
import { budgetLineSchema, fieldErrors } from "@velora/schemas";
import { useState, type FormEvent } from "react";
import { MonthSwitcher } from "@/components/month-switcher";
import { Rings } from "@/components/rings";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const BAR = { ok: "from-sky to-sky/60", near: "from-gold-1 to-gold-2", over: "from-negative to-negative/70" } as const;

export function BudgetsPanel() {
  const [month, setMonth] = useState(monthKey());
  const currency = useCurrency();
  const budget = useBudget(month);
  const lines = budget.data ?? [];
  const budgeted = lines.reduce((s, l) => s + l.budgeted, 0);
  const spent = lines.reduce((s, l) => s + l.spent, 0);
  const isCurrent = month === monthKey();

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.4fr]">
      <section className="glass enter flex flex-col items-center gap-5 p-8 text-center" style={{ ["--i" as string]: 1 }}>
        <div className="w-full text-left">
          <p className="label-mono">Budgets</p>
          <h2 className="mt-2 font-serif text-5xl leading-none">Spend with <em className="text-gold-2">intent.</em></h2>
          <div className="mt-4"><MonthSwitcher month={month} onChange={setMonth} /></div>
        </div>
        <div className="relative">
          <Rings size={220} parts={[[budgeted ? spent / budgeted : 0, spent > budgeted ? "negative" : "gold-1"]]} label="Share of budget spent" />
          <div className="absolute inset-0 grid place-items-center">
            <div><p className="font-serif text-5xl">{budgeted ? Math.round((spent / budgeted) * 100) : 0}%</p><p className="label-mono">spent</p></div>
          </div>
        </div>
        <p className="font-serif text-3xl">{formatMoney(spent, currency)} <span className="text-xl text-faint">/ {formatMoney(budgeted, currency)}</span></p>
        {isCurrent && <p className="text-sm text-muted">{daysLeftInMonth()} {daysLeftInMonth() === 1 ? "day" : "days"} left this month</p>}
        <SetBudgetDialog month={month} />
      </section>
      <section className="glass enter p-8" style={{ ["--i" as string]: 2 }}>
        {budget.error && <ErrorNote error={budget.error} />}
        {budget.isPending && <div className="grid gap-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
        {budget.data?.length === 0 && <Empty title="No budget yet" body="Pick the categories you want to keep an eye on and give each a monthly limit." />}
        <ul className="grid gap-6">
          {lines.map((l, i) => {
            const st = budgetStatus(l);
            return (
              <li key={l.category_id}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{l.icon} {l.name}</span>
                  <span className={cn("tabular-nums text-muted", st.state === "over" && "text-negative")}>{formatMoney(l.spent, currency)} / {formatMoney(l.budgeted, currency)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-text/[.07]" role="progressbar" aria-label={l.name} aria-valuenow={Math.round(st.ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={cn("h-full origin-left rounded-full bg-gradient-to-r motion-safe:animate-[grow_1.4s_var(--ease-out-expo)_both]", BAR[st.state])} style={{ width: `${Math.min(st.ratio, 1) * 100}%`, animationDelay: `${0.4 + i * 0.09}s` }} />
                </div>
                {st.state === "over" && <p className="mt-1.5 text-xs text-negative">Over by {formatMoney(-st.remaining, currency)}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SetBudgetDialog({ month }: { month: string }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: categories = [] } = useCategories();
  const currency = useCurrency();
  const set = useSetBudgetLine(month);
  const expense = categories.filter((c) => c.kind === "expense");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const input = { categoryId: f.categoryId ?? "", amount: f.amount ?? "" };
    const parsed = budgetLineSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    set.mutate(input, { onSuccess: () => setOpen(false) });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="lg" className="w-full">Set a category budget</Button></DialogTrigger>
      <DialogContent title="Category budget" description="Setting a category again updates its limit.">
        <form onSubmit={submit} className="grid gap-4" noValidate onChange={clearErrorOnEdit(setErrors)}>
          <Field id="categoryId" label="Category" error={errors.categoryId}>
            <Select id="categoryId" name="categoryId">{expense.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</Select>
          </Field>
          <Field id="amount" label={`Monthly limit (${currency})`} error={errors.amount}>
            <Input id="amount" name="amount" inputMode="decimal" placeholder="0" aria-invalid={!!errors.amount} />
          </Field>
          {set.error && <ErrorNote error={set.error} />}
          <Button type="submit" size="lg" disabled={set.isPending}>Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
