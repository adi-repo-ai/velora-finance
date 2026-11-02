"use client";

import {
  formatMoney, guessCategory, importRows, merchantFromNarration, monthKey, type ImportedRow, type StatementImport,
} from "@velora/core";
import { useAccounts, useAddTransaction, useCategories, useCurrency, useDeleteTransaction, useImportTransactions, useProfile, useTransactions } from "@velora/data";
import { fieldErrors, transactionSchema } from "@velora/schemas";
import { useState, type FormEvent } from "react";
import { Money } from "@/components/money";
import { FlowOverview } from "@/components/flow-overview";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { readRows } from "@/lib/read-rows";
import { cn } from "@/lib/utils";

export default function ActivityPage() {
  const [month, setMonth] = useState(monthKey());
  const txns = useTransactions(month);
  const del = useDeleteTransaction();
  const groups = Map.groupBy(txns.data ?? [], (t) => t.posted_on);

  return (
    <div className="grid gap-6">
    <FlowOverview month={month} onChange={setMonth} />
    <section className="glass enter p-8 sm:p-10" style={{ ["--i" as string]: 3 }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">Activity</p>
          <h1 className="mt-2 font-serif text-6xl leading-none">Every <em className="text-gold-2">rupee & cent.</em></h1>
        </div>
        <div className="flex gap-2"><ImportDialog /><AddTransactionDialog /></div>
      </div>
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
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface/60 text-lg shadow-[inset_0_0_0_1px_rgb(23_20_15/.06)]" aria-hidden>{t.category?.icon ?? "•"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{t.merchant || t.description || t.category?.name || "Transaction"}</p>
                    <p className="text-xs text-faint">{t.category?.name ?? "Uncategorised"} · {t.account?.name}{t.source === "import" && " · imported"}</p>
                  </div>
                  <Money minor={t.amount} currency={t.account?.currency ?? "USD"} sign className={cn("text-2xl", t.amount > 0 && "text-positive")} />
                  <ConfirmDialog
                    title="Delete transaction?"
                    description={<>“{t.merchant || t.description || "This transaction"}” will be removed and your balances and reports will update. This can’t be undone.</>}
                    onConfirm={() => del.mutateAsync(t.id)}
                    trigger={
                      <Button variant="danger" size="icon" aria-label={`Delete ${t.merchant || t.description || "transaction"}`} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
                        <Trash2 className="size-4" />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
    </div>
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
                <button type="button" role="radio" aria-checked={kind === k} key={k} onClick={() => setKind(k)} className={cn("flex-1 rounded-xl py-2 capitalize text-muted", kind === k && "bg-surface text-text shadow")}>{k}</button>
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
                <DatePicker id="postedOn" name="postedOn" defaultValue={new Date().toLocaleDateString("en-CA")} />
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

type Draft = ImportedRow & { include: boolean; merchant: string; categoryId: string };

function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<StatementImport | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [readError, setReadError] = useState<string>();
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [accountId, setAccountId] = useState("");
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();
  const home = useCurrency();
  const run = useImportTransactions();
  const matching = accounts.filter((a) => a.currency === currency);
  const target = matching.find((a) => a.id === accountId) ?? matching[0];
  const chosen = drafts.filter((d) => d.include);

  function reset() { setResult(null); setDrafts([]); setReadError(undefined); run.reset(); }

  async function onFile(file: File | undefined) {
    reset();
    if (!file) return;
    try {
      // Indian statements write dates day-first; US ones month-first.
      const r = importRows(await readRows(file), { dayFirst: profile?.home_country === "IN" });
      const byName = new Map(categories.map((c) => [c.name, c.id]));
      setResult(r);
      setCurrency(r.currency ?? home);
      setDrafts(r.rows.map((row) => ({
        ...row, include: true, merchant: merchantFromNarration(row.description),
        categoryId: byName.get(guessCategory(row.description, row.amount) ?? "") ?? "",
      })));
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "Couldn’t read that file");
    }
  }

  const edit = (i: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button variant="glass">Import</Button></DialogTrigger>
      <DialogContent
        title="Import a statement"
        description="Excel (.xlsx), CSV or TSV from any bank. We find the Date, Description and Amount (or Debit/Credit) columns, spot ₹ or $, and let you review everything before it’s saved. Re-importing the same file never creates duplicates."
        className="w-[min(720px,calc(100vw-32px))]"
      >
        <Field id="file" label="Statement file">
          <Input id="file" type="file" accept=".xlsx,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="pt-2.5" onChange={(e) => onFile(e.target.files?.[0])} />
        </Field>
        {readError && <ErrorNote error={new Error(readError)} />}

        {result && (
          <>
            <div className="grid gap-4 rounded-3xl bg-surface/50 p-4 sm:grid-cols-[auto_1fr] sm:items-end">
              <Field id="importCurrency" label={result.currency ? `Currency · detected ${result.currency}` : "Currency · not detected, please confirm"}>
                <Select id="importCurrency" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "INR")}>
                  <option value="INR">₹ INR — Indian rupee</option>
                  <option value="USD">$ USD — US dollar</option>
                </Select>
              </Field>
              {matching.length ? (
                <Field id="importAccount" label={`Into ${currency} account`}>
                  <Select id="importAccount" value={target?.id ?? ""} onChange={(e) => setAccountId(e.target.value)}>
                    {matching.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </Field>
              ) : (
                <p className="text-sm text-negative">You have no {currency} account yet. <a href="/accounts#accounts" className="font-medium underline">Add one</a>, or switch the currency if it was detected wrongly.</p>
              )}
            </div>

            {drafts.length > 0 && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p><b>{chosen.length}</b> of {drafts.length} selected{result.errors.length > 0 && <>, <span className="text-negative">{result.errors.length} lines skipped</span></>}</p>
                  <div className="flex gap-3 text-gold-2">
                    <button type="button" className="font-medium hover:underline" onClick={() => setDrafts((ds) => ds.map((d) => ({ ...d, include: true })))}>Select all</button>
                    <button type="button" className="font-medium hover:underline" onClick={() => setDrafts((ds) => ds.map((d) => ({ ...d, include: false })))}>Select none</button>
                  </div>
                </div>
                <div className="mt-2 max-h-[44vh] overflow-auto rounded-2xl border border-line">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="sticky top-0 bg-surface text-left"><tr className="label-mono">
                      <th className="w-10 p-2"><span className="sr-only">Include</span></th><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2">Category</th><th className="p-2 text-right">Amount</th>
                    </tr></thead>
                    <tbody>
                      {drafts.map((d, i) => (
                        <tr key={d.externalId} className={cn("border-t border-line", !d.include && "opacity-45")}>
                          <td className="p-2 text-center"><input type="checkbox" checked={d.include} onChange={(e) => edit(i, { include: e.target.checked })} aria-label={`Include ${d.merchant}`} className="size-4 accent-[rgb(var(--gold-2))]" /></td>
                          <td className="whitespace-nowrap p-2 text-muted">{d.postedOn}</td>
                          <td className="p-2"><input value={d.merchant} onChange={(e) => edit(i, { merchant: e.target.value })} title={d.description} aria-label="Description" className="w-full rounded-lg bg-transparent px-2 py-1 hover:bg-surface/70 focus:bg-surface focus:outline-2 focus:outline-gold-1" /></td>
                          <td className="p-2">
                            <Select value={d.categoryId} onChange={(e) => edit(i, { categoryId: e.target.value })} aria-label="Category" className="h-9 rounded-xl border-transparent bg-transparent px-2 text-sm shadow-none hover:bg-surface/70">
                              <option value="">Uncategorised</option>
                              {categories.filter((c) => (d.amount > 0 ? c.kind !== "expense" : c.kind !== "income")).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </Select>
                          </td>
                          <td className={cn("whitespace-nowrap p-2 text-right font-medium", d.amount > 0 && "text-positive")}>{formatMoney(d.amount, currency, { cents: true })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {result.errors.slice(0, 3).map((e) => <p key={e.line} className="text-xs text-negative">Line {e.line}: {e.reason}</p>)}
          </>
        )}
        {run.data && <p role="status" className="text-sm text-positive">Imported {run.data.inserted}. {run.data.skipped > 0 && `${run.data.skipped} already existed.`}</p>}
        {run.error && <ErrorNote error={run.error} />}
        <Button
          size="lg"
          loading={run.isPending}
          disabled={!chosen.length || !target || !!run.data}
          onClick={() => target && run.mutate({ accountId: target.id, rows: chosen.map((d) => ({ postedOn: d.postedOn, description: d.description, amount: d.amount, externalId: d.externalId, merchant: d.merchant, categoryId: d.categoryId || null })) })}
        >
          {run.isPending ? "Importing…" : `Import ${chosen.length || ""} transactions`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
