"use client";

import { importStatement, merchantFromNarration, monthKey, type ImportResult } from "@velora/core";
import { useAccounts, useAddTransaction, useCategories, useCurrency, useDeleteTransaction, useImportTransactions, useProfile, useTransactions } from "@velora/data";
import { fieldErrors, transactionSchema } from "@velora/schemas";
import { useState, type FormEvent } from "react";
import { Money } from "@/components/money";
import { MonthSwitcher } from "@/components/month-switcher";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ActivityPage() {
  const [month, setMonth] = useState(monthKey());
  const txns = useTransactions(month);
  const del = useDeleteTransaction();
  const groups = Map.groupBy(txns.data ?? [], (t) => t.posted_on);

  return (
    <section className="glass enter mx-auto max-w-4xl p-8 sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">Activity</p>
          <h1 className="mt-2 font-serif text-6xl leading-none">Every <em className="text-gold-2">rupee & cent.</em></h1>
        </div>
        <div className="flex gap-2"><ImportDialog /><AddTransactionDialog /></div>
      </div>
      <div className="mt-6"><MonthSwitcher month={month} onChange={setMonth} /></div>
      <div className="mt-6">
        {txns.error && <ErrorNote error={txns.error} />}
        {txns.isPending && <div className="grid gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}
        {txns.data?.length === 0 && <Empty title="A quiet month" body="Add a transaction or import a bank statement (CSV) to get started." />}
        {[...groups].map(([day, rows]) => (
          <div key={day} className="mt-5">
            <h2 className="label-mono">{new Date(`${day}T00:00:00`).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short" })}</h2>
            <ul className="mt-1">
              {rows.map((t) => (
                <li key={t.id} className="group flex items-center gap-4 border-b border-line py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/60 text-lg shadow-[inset_0_0_0_1px_rgb(23_20_15/.06)]" aria-hidden>{t.category?.icon ?? "•"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{t.merchant || t.description || t.category?.name || "Transaction"}</p>
                    <p className="text-xs text-faint">{t.category?.name ?? "Uncategorised"} · {t.account?.name}{t.source === "import" && " · imported"}</p>
                  </div>
                  <Money minor={t.amount} currency={t.account?.currency ?? "USD"} sign className={cn("text-2xl", t.amount > 0 && "text-positive")} />
                  <Button
                    variant="danger" size="icon" aria-label={`Delete ${t.description || "transaction"}`}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    disabled={del.isPending}
                    onClick={() => confirm("Delete this transaction?") && del.mutate(t.id)}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const currency = useCurrency();
  const add = useAddTransaction();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const input = { kind, amount: f.amount ?? "", accountId: f.accountId ?? "", categoryId: f.categoryId || undefined, postedOn: f.postedOn ?? "", description: f.description ?? "" };
    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    add.mutate(input, { onSuccess: () => setOpen(false) });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add transaction</Button></DialogTrigger>
      <DialogContent title="New transaction">
        {accounts.length === 0 ? (
          <Empty title="Add an account first" body="Transactions belong to an account." action={{ href: "/accounts", label: "Add account" }} />
        ) : (
          <form onSubmit={submit} className="grid gap-4" noValidate onChange={clearErrorOnEdit(setErrors)}>
            <div role="radiogroup" aria-label="Type" className="flex rounded-2xl bg-text/[.06] p-1 text-sm font-semibold">
              {(["expense", "income"] as const).map((k) => (
                <button type="button" role="radio" aria-checked={kind === k} key={k} onClick={() => setKind(k)} className={cn("flex-1 rounded-xl py-2 capitalize text-muted", kind === k && "bg-white text-text shadow")}>{k}</button>
              ))}
            </div>
            <Field id="amount" label={`Amount (${currency})`} error={errors.amount}>
              <Input id="amount" name="amount" inputMode="decimal" autoFocus placeholder="0.00" className="h-16 text-center font-serif text-4xl" aria-invalid={!!errors.amount} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="accountId" label="Account" error={errors.accountId}>
                <Select id="accountId" name="accountId" defaultValue={accounts[0]?.id}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
              </Field>
              <Field id="categoryId" label="Category">
                <Select id="categoryId" name="categoryId" defaultValue="">
                  <option value="">Uncategorised</option>
                  {categories.filter((c) => (kind === "income" ? c.kind === "income" : c.kind !== "income")).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="postedOn" label="Date" error={errors.postedOn}>
                <Input id="postedOn" name="postedOn" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} />
              </Field>
              <Field id="description" label="Description">
                <Input id="description" name="description" placeholder="e.g. Swiggy" maxLength={300} />
              </Field>
            </div>
            {add.error && <ErrorNote error={add.error} />}
            <Button type="submit" size="lg" disabled={add.isPending}>{add.isPending ? "Saving…" : "Save transaction"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [accountId, setAccountId] = useState("");
  const { data: accounts = [] } = useAccounts();
  const { data: profile } = useProfile();
  const run = useImportTransactions();

  async function onFile(file: File | undefined) {
    run.reset();
    if (!file) return setPreview(null);
    // Indian statements write dates day-first; US ones month-first.
    setPreview(importStatement(await file.text(), { dayFirst: profile?.home_country === "IN" }));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPreview(null); run.reset(); } }}>
      <DialogTrigger asChild><Button variant="glass">Import CSV</Button></DialogTrigger>
      <DialogContent title="Import a statement" description="CSV export from your bank. We look for Date, Description and Amount (or Debit/Credit) columns. Re-importing the same file never creates duplicates.">
        <Field id="importAccount" label="Into account">
          <Select id="importAccount" value={accountId || accounts[0]?.id || ""} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field id="file" label="Statement file">
          <Input id="file" type="file" accept=".csv,text/csv" className="pt-2.5" onChange={(e) => onFile(e.target.files?.[0])} />
        </Field>
        {preview && (
          <div className="rounded-2xl bg-white/50 p-4 text-sm">
            <p><b>{preview.rows.length}</b> transactions ready{preview.errors.length > 0 && <>, <span className="text-negative">{preview.errors.length} skipped</span></>}</p>
            {preview.errors.slice(0, 3).map((e) => <p key={e.line} className="mt-1 text-xs text-negative">Line {e.line}: {e.reason}</p>)}
          </div>
        )}
        {run.data && <p role="status" className="text-sm text-positive">Imported {run.data.inserted}. {run.data.skipped > 0 && `${run.data.skipped} already existed.`}</p>}
        {run.error && <ErrorNote error={run.error} />}
        <Button
          size="lg"
          disabled={!preview?.rows.length || run.isPending || !accounts.length}
          onClick={() => preview && run.mutate({ accountId: accountId || accounts[0]!.id, rows: preview.rows.map((r) => ({ ...r, merchant: merchantFromNarration(r.description) })) })}
        >
          {run.isPending ? "Importing…" : "Import"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
