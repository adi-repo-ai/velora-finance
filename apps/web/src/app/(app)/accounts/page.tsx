"use client";

import { formatMoney } from "@velora/core";
import { useAccounts, useAddAccount, useCurrency, useProfile } from "@velora/data";
import { accountSchema, fieldErrors } from "@velora/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TYPES = ["checking", "savings", "credit", "loan", "investment", "cash", "wallet"] as const;

export default function AccountsPage() {
  const accounts = useAccounts();
  const { data: profile } = useProfile();
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await getSupabase().auth.signOut();
    qc.clear(); // drop the previous user's cached data
    router.replace("/login");
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <section className="glass enter p-8 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="label-mono">Accounts</p><h1 className="mt-2 font-serif text-6xl leading-none">Your <em className="text-gold-2">money map.</em></h1></div>
          <AddAccountDialog />
        </div>
        <p className="mt-3 text-sm text-muted">Bank sync (Plaid in the US, Account Aggregator in India) is coming. For now, add accounts manually and import statements as CSV.</p>
        <div className="mt-6">
          {accounts.error && <ErrorNote error={accounts.error} />}
          {accounts.isPending && <Skeleton className="h-32 w-full" />}
          {accounts.data?.length === 0 && <Empty title="No accounts yet" body="Add your main bank account with today's balance to begin." />}
          <ul>
            {accounts.data?.map((a) => (
              <li key={a.id} className="flex items-center gap-4 border-b border-line py-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-white/60 font-mono text-[10px] uppercase tracking-widest text-faint shadow-[inset_0_0_0_1px_rgb(23_20_15/.06)]">{a.mask ?? a.type.slice(0, 3)}</span>
                <div className="flex-1"><p>{a.name}</p><p className="text-xs capitalize text-faint">{a.type}{a.institution && ` · ${a.institution}`} · {a.currency}</p></div>
                <span className={cn("font-serif text-2xl", a.balance < 0 && "text-negative")}>{formatMoney(a.balance, a.currency, { cents: true })}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="glass enter flex flex-wrap items-center justify-between gap-4 p-8" style={{ ["--i" as string]: 1 }}>
        <div>
          <p className="label-mono">Signed in</p>
          <p className="mt-1 font-serif text-3xl">{profile?.display_name || "—"}</p>
          <p className="text-sm text-muted">{profile?.home_country === "IN" ? "🇮🇳 India · INR" : "🇺🇸 United States · USD"}</p>
        </div>
        <Button variant="glass" onClick={signOut}>Sign out</Button>
      </section>
    </div>
  );
}

function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const currency = useCurrency();
  const add = useAddAccount();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const input = { name: f.name ?? "", type: (f.type ?? "checking") as "checking", currency: (f.currency ?? currency) as "USD", institution: f.institution, mask: f.mask, openingBalance: f.openingBalance || "0" };
    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    add.mutate(input, { onSuccess: () => setOpen(false) });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add account</Button></DialogTrigger>
      <DialogContent title="New account" description="For cards and loans, enter what you currently owe.">
        <form onSubmit={submit} className="grid gap-4" noValidate onChange={clearErrorOnEdit(setErrors)}>
          <Field id="name" label="Name" error={errors.name}><Input id="name" name="name" placeholder="HDFC Savings" aria-invalid={!!errors.name} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="type" label="Type"><Select id="type" name="type">{TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}</Select></Field>
            <Field id="currency" label="Currency"><Select id="currency" name="currency" defaultValue={currency}><option>USD</option><option>INR</option></Select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="institution" label="Bank (optional)"><Input id="institution" name="institution" /></Field>
            <Field id="mask" label="Last 4 digits (optional)" error={errors.mask}><Input id="mask" name="mask" inputMode="numeric" maxLength={4} aria-invalid={!!errors.mask} /></Field>
          </div>
          <Field id="openingBalance" label="Balance today" error={errors.openingBalance}><Input id="openingBalance" name="openingBalance" inputMode="decimal" placeholder="0.00" /></Field>
          {add.error && <ErrorNote error={add.error} />}
          <Button type="submit" size="lg" disabled={add.isPending}>Add account</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
