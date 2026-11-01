"use client";

import { formatMoney, parseToMinor } from "@velora/core";
import { useAddGoal, useContribute, useCurrency, useDeleteGoal, useGoals } from "@velora/data";
import { fieldErrors, goalSchema } from "@velora/schemas";
import { useState, type FormEvent } from "react";
import { Orb } from "@/components/orb";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";

export default function GoalsPage() {
  const goals = useGoals();
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 px-2">
        <div><p className="label-mono">Goals</p><h1 className="mt-2 font-serif text-6xl leading-none">Save for <em className="text-gold-2">what matters.</em></h1></div>
        <AddGoalDialog />
      </div>
      {goals.error && <ErrorNote error={goals.error} />}
      {goals.isPending && <Skeleton className="h-80 w-full" />}
      {goals.data?.length === 0 && <section className="glass"><Empty title="No goals yet" body="A trip, an emergency fund, a new laptop — give it a target and watch the orb fill." /></section>}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {goals.data?.map((g, i) => <GoalCard key={g.id} goal={g} i={i} />)}
      </div>
    </div>
  );
}

function GoalCard({ goal: g, i }: { goal: NonNullable<ReturnType<typeof useGoals>["data"]>[number]; i: number }) {
  const [amount, setAmount] = useState("");
  const contribute = useContribute();
  const del = useDeleteGoal();
  const pct = g.saved_amount / g.target_amount;
  const minor = parseToMinor(amount);
  return (
    <section className="glass enter relative flex flex-col items-center gap-4 p-8 text-center" style={{ ["--i" as string]: i + 1 }}>
      <div className="absolute right-4 top-4">
        <ConfirmDialog
          title="Delete goal?"
          description={<>“{g.name}” and its saved progress will be removed. Money in your accounts isn’t affected.</>}
          onConfirm={() => del.mutateAsync(g.id)}
          trigger={<Button variant="danger" size="icon" aria-label={`Delete goal ${g.name}`}><Trash2 className="size-4" /></Button>}
        />
      </div>
      <p className="label-mono">{g.target_date ? `By ${new Date(`${g.target_date}T00:00:00`).toLocaleDateString("en", { month: "short", year: "numeric" })}` : "Open-ended"}</p>
      <h2 className="font-serif text-4xl">{g.emoji} {g.name}</h2>
      <Orb size={210} pct={pct}><span className="font-serif text-6xl leading-none">{Math.round(pct * 100)}<span className="text-3xl">%</span></span></Orb>
      <p className="font-serif text-3xl">{formatMoney(g.saved_amount, g.currency)} <span className="text-xl text-faint">/ {formatMoney(g.target_amount, g.currency)}</span></p>
      <form
        className="flex w-full gap-2"
        onSubmit={(e) => { e.preventDefault(); if (minor && minor > 0) contribute.mutate({ goalId: g.id, amount: minor }, { onSuccess: () => setAmount("") }); }}
      >
        <Input aria-label={`Amount to add to ${g.name}`} inputMode="decimal" placeholder="Add amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button type="submit" disabled={!minor || minor <= 0 || contribute.isPending}>Add</Button>
      </form>
      {contribute.error && <ErrorNote error={contribute.error} />}
    </section>
  );
}

function AddGoalDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const currency = useCurrency();
  const add = useAddGoal();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const input = { name: f.name ?? "", emoji: f.emoji || "🎯", target: f.target ?? "", targetDate: f.targetDate || undefined };
    const parsed = goalSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    add.mutate(input, { onSuccess: () => setOpen(false) });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>New goal</Button></DialogTrigger>
      <DialogContent title="New goal">
        <form onSubmit={submit} className="grid gap-4" noValidate onChange={clearErrorOnEdit(setErrors)}>
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field id="emoji" label="Icon"><Input id="emoji" name="emoji" defaultValue="✈️" maxLength={8} className="text-center text-xl" /></Field>
            <Field id="name" label="Name" error={errors.name}><Input id="name" name="name" placeholder="Goa, December" aria-invalid={!!errors.name} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="target" label={`Target (${currency})`} error={errors.target}><Input id="target" name="target" inputMode="decimal" aria-invalid={!!errors.target} /></Field>
            <Field id="targetDate" label="By (optional)"><Input id="targetDate" name="targetDate" type="date" /></Field>
          </div>
          {add.error && <ErrorNote error={add.error} />}
          <Button type="submit" size="lg" disabled={add.isPending}>Create goal</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
