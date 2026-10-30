"use client";

import { formatMoney } from "@velora/core";
import { useAddBill, useBills, useCurrency, useMarkBillPaid } from "@velora/data";
import { billSchema, fieldErrors } from "@velora/schemas";
import { useState, type FormEvent } from "react";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const daysUntil = (iso: string) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);

export default function BillsPage() {
  const bills = useBills();
  const paid = useMarkBillPaid();
  return (
    <section className="glass enter mx-auto max-w-3xl p-8 sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="label-mono">Bills & subscriptions</p><h1 className="mt-2 font-serif text-6xl leading-none">Never <em className="text-gold-2">miss one.</em></h1></div>
        <AddBillDialog />
      </div>
      <p className="mt-3 text-sm text-muted">The mobile app sends a reminder before each due date.</p>
      <div className="mt-6">
        {bills.error && <ErrorNote error={bills.error} />}
        {bills.isPending && <Skeleton className="h-40 w-full" />}
        {bills.data?.length === 0 && <Empty title="No bills yet" body="Add rent, cards, phone and subscriptions to see what's coming." />}
        <ul>
          {bills.data?.map((b) => {
            const d = daysUntil(b.next_due_on);
            return (
              <li key={b.id} className="flex items-center gap-4 border-b border-line py-4">
                <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl bg-surface/60 text-center leading-none shadow-[inset_0_0_0_1px_rgb(23_20_15/.06)]", d <= 3 && "shadow-[inset_0_0_0_1.5px_rgb(201_155_91)]")}>
                  <span><span className="block font-serif text-xl">{new Date(`${b.next_due_on}T00:00:00`).getDate()}</span><span className="label-mono text-[9px]">{new Date(`${b.next_due_on}T00:00:00`).toLocaleString("en", { month: "short" })}</span></span>
                </span>
                <div className="min-w-0 flex-1">
                  <p>{b.name}</p>
                  <p className={cn("text-xs text-faint", d < 0 && "text-negative")}>{d < 0 ? `${-d} ${d === -1 ? "day" : "days"} overdue` : d === 0 ? "Due today" : `In ${d} ${d === 1 ? "day" : "days"}`} · {b.cadence}{b.autopay && " · autopay"}</p>
                </div>
                <span className="font-serif text-2xl">{formatMoney(b.amount, b.currency)}</span>
                <Button variant="glass" size="sm" disabled={paid.isPending} onClick={() => paid.mutate(b.id)}>Mark paid</Button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function AddBillDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const currency = useCurrency();
  const add = useAddBill();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const f = Object.fromEntries(fd) as Record<string, string>;
    const input = {
      name: f.name ?? "", amount: f.amount ?? "", cadence: (f.cadence ?? "monthly") as "monthly",
      nextDueOn: f.nextDueOn ?? "", remindDaysBefore: Number(f.remindDaysBefore ?? 3), autopay: fd.get("autopay") === "on",
    };
    const parsed = billSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    add.mutate(input, { onSuccess: () => setOpen(false) });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add bill</Button></DialogTrigger>
      <DialogContent title="New bill">
        <form onSubmit={submit} className="grid gap-4" noValidate onChange={clearErrorOnEdit(setErrors)}>
          <Field id="name" label="Name" error={errors.name}><Input id="name" name="name" placeholder="HDFC card" aria-invalid={!!errors.name} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="amount" label={`Amount (${currency})`} error={errors.amount}><Input id="amount" name="amount" inputMode="decimal" aria-invalid={!!errors.amount} /></Field>
            <Field id="cadence" label="Repeats"><Select id="cadence" name="cadence" defaultValue="monthly"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nextDueOn" label="Next due" error={errors.nextDueOn}><Input id="nextDueOn" name="nextDueOn" type="date" aria-invalid={!!errors.nextDueOn} /></Field>
            <Field id="remindDaysBefore" label="Remind me (days before)"><Input id="remindDaysBefore" name="remindDaysBefore" type="number" min={0} max={30} defaultValue={3} /></Field>
          </div>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="autopay" className="size-4 accent-[rgb(var(--gold-2))]" /> Paid automatically (autopay)</label>
          {add.error && <ErrorNote error={add.error} />}
          <Button type="submit" size="lg" disabled={add.isPending}>Save bill</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
