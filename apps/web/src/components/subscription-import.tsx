"use client";

import { detectCurrency, domainFromInput, formatMoney, importSubscriptionRows, type Cadence, type SubscriptionImport } from "@velora/core";
import { useAddBills, useCurrency, useProfile } from "@velora/data";
import type { SubscriptionCategory } from "@velora/schemas";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ErrorNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { readRows } from "@/lib/read-rows";
import { CATEGORIES, lookupService, matchCategory } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

type Draft = {
  key: string; include: boolean; name: string; amount: number; cadence: Cadence; nextDueOn: string;
  currency: "USD" | "INR"; category: SubscriptionCategory | ""; website: string | null;
};

const SAMPLE = "Name,Price,Billing cycle,Next renewal,Category,Website\nNetflix,₹649,Monthly,2026-12-05,Streaming,netflix.com\nSpotify,$11.99,Monthly,2026-12-10,Music,spotify.com\nAdobe Creative Cloud,$239.88,Yearly,2027-03-01,Software,adobe.com\n";
const today = () => new Date().toLocaleDateString("en-CA");

/** Import subscriptions from a spreadsheet, then review (include, category, cycle, currency) before saving. */
export function SubscriptionImportDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SubscriptionImport | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [readError, setReadError] = useState<string>();
  const { data: profile } = useProfile();
  const home = useCurrency();
  const save = useAddBills();
  const chosen = drafts.filter((d) => d.include);

  function reset() { setResult(null); setDrafts([]); setReadError(undefined); save.reset(); }

  async function onFile(file?: File) {
    reset();
    if (!file) return;
    try {
      const rows = await readRows(file);
      const r = importSubscriptionRows(rows, { dayFirst: profile?.home_country === "IN" });
      const fileCurrency = detectCurrency(rows) ?? home;
      setResult(r);
      setDrafts(r.rows.map((row, i) => {
        const known = lookupService(row.name);
        return {
          key: `${i}-${row.name}`, include: true, name: row.name, amount: row.amount, cadence: row.cadence,
          nextDueOn: row.nextDueOn ?? today(), currency: row.currency ?? fileCurrency,
          category: matchCategory(row.category) ?? known?.category ?? "",
          website: (row.website && domainFromInput(row.website)) || known?.website || null,
        };
      }));
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "Couldn’t read that file");
    }
  }

  const edit = (i: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button variant="glass">Import</Button></DialogTrigger>
      <DialogContent
        title="Import subscriptions"
        description="Excel (.xlsx) or CSV with at least Name and Price. Billing cycle, Next renewal, Category, Website and Currency are picked up when present. You review everything before it’s saved."
        className="w-[min(720px,calc(100vw-32px))]"
      >
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line bg-surface/40 px-6 py-7 text-center transition hover:border-gold-1 hover:bg-surface/70">
          <FileSpreadsheet className="size-7 text-gold-2" aria-hidden />
          <span className="font-medium">Choose a spreadsheet</span>
          <span className="text-xs text-muted">.xlsx, .csv or .tsv</span>
          <input type="file" accept=".xlsx,.csv,.tsv,.txt" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE)}`} download="velora-subscriptions-sample.csv" className="-mt-2 flex w-fit items-center gap-1.5 text-sm font-medium text-gold-2 hover:underline">
          <Download className="size-4" aria-hidden />Download a sample file
        </a>
        {readError && <ErrorNote error={new Error(readError)} />}

        {result && drafts.length > 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p><b>{chosen.length}</b> of {drafts.length} selected{result.errors.length > 0 && <>, <span className="text-negative">{result.errors.length} lines skipped</span></>}</p>
              <div className="flex gap-3 text-gold-2">
                <button type="button" className="font-medium hover:underline" onClick={() => setDrafts((ds) => ds.map((d) => ({ ...d, include: true })))}>Select all</button>
                <button type="button" className="font-medium hover:underline" onClick={() => setDrafts((ds) => ds.map((d) => ({ ...d, include: false })))}>Select none</button>
              </div>
            </div>
            <ul className="mt-2 grid max-h-[46vh] gap-2 overflow-auto pr-1">
              {drafts.map((d, i) => (
                <li key={d.key} className={cn("grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-2xl bg-surface/50 p-3", !d.include && "opacity-45")}>
                  <input type="checkbox" checked={d.include} onChange={(e) => edit(i, { include: e.target.checked })} aria-label={`Include ${d.name}`} className="size-4 accent-[rgb(var(--gold-2))]" />
                  <BrandLogo name={d.name} domain={d.website} className="size-10 rounded-xl" />
                  <div className="min-w-0">
                    <input value={d.name} maxLength={60} onChange={(e) => edit(i, { name: e.target.value })} aria-label="Name" className="w-full truncate rounded-lg bg-transparent px-1 font-medium hover:bg-surface/70 focus:bg-surface focus:outline-2 focus:outline-gold-1" />
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Select aria-label="Category" value={d.category} onChange={(e) => edit(i, { category: e.target.value as SubscriptionCategory })} className="h-8 w-auto rounded-full px-3 text-xs">
                        <option value="">No category</option>
                        {(Object.keys(CATEGORIES) as SubscriptionCategory[]).map((c) => <option key={c} value={c}>{CATEGORIES[c].icon} {CATEGORIES[c].label}</option>)}
                      </Select>
                      <Select aria-label="Billing cycle" value={d.cadence} onChange={(e) => edit(i, { cadence: e.target.value as Cadence })} className="h-8 w-auto rounded-full px-3 text-xs">
                        <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                      </Select>
                      <DatePicker aria-label="Next renewal" defaultValue={d.nextDueOn} onChange={(v) => edit(i, { nextDueOn: v })} className="h-8 w-auto gap-2 rounded-full px-3 text-xs [&_svg]:size-3.5" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-xl">{formatMoney(d.amount, d.currency, { cents: true })}</p>
                    <Select aria-label="Currency" value={d.currency} onChange={(e) => edit(i, { currency: e.target.value as "USD" | "INR" })} className="mt-1 h-8 w-auto rounded-full px-3 text-xs">
                      <option value="INR">₹ INR</option><option value="USD">$ USD</option>
                    </Select>
                  </div>
                </li>
              ))}
            </ul>
            {result.errors.slice(0, 3).map((e) => <p key={e.line} className="mt-2 text-xs text-negative">Line {e.line}: {e.reason}</p>)}
          </div>
        )}
        {result && drafts.length === 0 && result.errors.map((e) => <p key={e.line} className="text-sm text-negative">Line {e.line}: {e.reason}</p>)}
        {save.data !== undefined && <p role="status" className="text-sm text-positive">Imported {save.data} subscriptions.</p>}
        {save.error && <ErrorNote error={save.error} />}
        <Button
          size="lg"
          loading={save.isPending}
          disabled={!chosen.length || save.data !== undefined}
          onClick={() => save.mutate(chosen.map((d) => ({
            kind: "subscription" as const, name: d.name, amount: (d.amount / 100).toFixed(2), cadence: d.cadence, nextDueOn: d.nextDueOn,
            currency: d.currency, category: d.category || undefined, website: d.website ?? undefined, autopay: true, notify: true, remindDaysBefore: 7,
          })))}
        >
          {save.isPending ? "Importing…" : `Import ${chosen.length || ""} subscriptions`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
