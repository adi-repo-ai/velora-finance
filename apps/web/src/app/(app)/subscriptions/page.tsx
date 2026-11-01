"use client";

import { formatMoney, monthlyCost } from "@velora/core";
import { useAddBill, useBills, useCurrency, useDeleteBill, useMarkBillPaid } from "@velora/data";
import { billSchema, fieldErrors } from "@velora/schemas";
import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Popular services in the US and India; picking one fills the name and logo. */
const POPULAR = [
  ["Netflix", "netflix.com"], ["Spotify", "spotify.com"], ["YouTube Premium", "youtube.com"], ["Prime Video", "primevideo.com"],
  ["Disney+ Hotstar", "hotstar.com"], ["JioCinema", "jiocinema.com"], ["SonyLIV", "sonyliv.com"], ["ZEE5", "zee5.com"],
  ["Apple One", "apple.com"], ["iCloud+", "icloud.com"], ["Google One", "one.google.com"], ["ChatGPT Plus", "openai.com"],
  ["Claude Pro", "claude.ai"], ["Microsoft 365", "microsoft.com"], ["Adobe Creative Cloud", "adobe.com"], ["Canva Pro", "canva.com"],
  ["Notion", "notion.so"], ["Dropbox", "dropbox.com"], ["LinkedIn Premium", "linkedin.com"], ["Audible", "audible.com"],
  ["Kindle Unlimited", "amazon.com"], ["Swiggy One", "swiggy.com"], ["Zomato Gold", "zomato.com"], ["Hulu", "hulu.com"],
  ["Max", "max.com"], ["Duolingo", "duolingo.com"],
] as const;

const daysUntil = (iso: string) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);

export default function SubscriptionsPage() {
  const subs = useBills("subscription");
  const del = useDeleteBill();
  const renewed = useMarkBillPaid();
  const currency = useCurrency();
  const list = subs.data ?? [];
  // Totals in the user's currency only; mixed-currency subs are rare and would need FX.
  const mine = list.filter((s) => s.currency === currency);
  const monthly = mine.reduce((sum, s) => sum + monthlyCost(s.amount, s.cadence), 0);
  const next = list[0];

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <section className="glass enter p-8 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="label-mono">Subscriptions</p><h1 className="mt-2 font-serif text-6xl leading-none">Every <em className="text-gold-2">renewal.</em></h1></div>
          <AddSubscriptionDialog />
        </div>
        <dl className="mt-8 grid gap-4 sm:grid-cols-4">
          <Stat label="Per month" value={formatMoney(monthly, currency)} />
          <Stat label="Per year" value={formatMoney(monthly * 12, currency)} />
          <Stat label="Active" value={String(list.length)} />
          <Stat label="Next renewal" value={next ? new Date(`${next.next_due_on}T00:00:00`).toLocaleDateString("en", { day: "numeric", month: "short" }) : "—"} hint={next?.name} />
        </dl>
      </section>

      <section className="glass enter p-8 sm:p-10" style={{ ["--i" as string]: 1 }}>
        {subs.error && <ErrorNote error={subs.error} />}
        {subs.isPending && <div className="grid gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
        {subs.data?.length === 0 && <Empty title="No subscriptions yet" body="Add Netflix, Spotify, iCloud and the rest to see what they really cost you each year." />}
        <ul>
          {list.map((s) => {
            const d = daysUntil(s.next_due_on);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-4 border-b border-line py-4 last:border-0">
                <BrandLogo name={s.name} domain={s.website} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className={cn("text-xs text-faint", d < 0 && "text-negative")}>
                    {d < 0 ? `Renewal ${-d} ${d === -1 ? "day" : "days"} overdue` : d === 0 ? "Renews today" : `Renews in ${d} ${d === 1 ? "day" : "days"}`}
                    {" · "}{s.cadence}{s.autopay && " · auto-renews"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl">{formatMoney(s.amount, s.currency)}</p>
                  {s.cadence !== "monthly" && <p className="text-xs text-faint">≈ {formatMoney(monthlyCost(s.amount, s.cadence), s.currency)}/mo</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="glass" size="sm" disabled={renewed.isPending} onClick={() => renewed.mutate(s.id)}>Mark renewed</Button>
                  <ConfirmDialog
                    title="Remove subscription?"
                    description={<>“{s.name}” will be removed from Velora. This doesn’t cancel the subscription with {s.name} itself.</>}
                    confirmLabel="Remove"
                    onConfirm={() => del.mutateAsync(s.id)}
                    trigger={<Button variant="danger" size="icon" aria-label={`Remove ${s.name}`}><Trash2 className="size-4" /></Button>}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl bg-surface/50 p-5 shadow-[inset_0_0_0_1px_rgb(23_20_15/.05)]">
      <dt className="label-mono">{label}</dt>
      <dd className="mt-2 font-serif text-3xl leading-none">{value}</dd>
      {hint && <dd className="mt-1 truncate text-xs text-muted">{hint}</dd>}
    </div>
  );
}

function AddSubscriptionDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const currency = useCurrency();
  const add = useAddBill();

  function pick(n: string, w: string) {
    setName(n);
    setWebsite(w);
    setErrors({});
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const f = Object.fromEntries(fd) as Record<string, string>;
    const input = {
      kind: "subscription" as const, name, website, amount: f.amount ?? "", cadence: (f.cadence ?? "monthly") as "monthly",
      nextDueOn: f.nextDueOn ?? "", remindDaysBefore: Number(f.remindDaysBefore ?? 2), autopay: fd.get("autopay") === "on",
    };
    const parsed = billSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    add.mutate(input, { onSuccess: () => { setOpen(false); pick("", ""); } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add subscription</Button></DialogTrigger>
      <DialogContent title="New subscription" className="w-[min(620px,calc(100vw-32px))]">
        <div>
          <p className="label-mono">Popular</p>
          <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
            {POPULAR.map(([n, w]) => (
              <button
                type="button" key={n} onClick={() => pick(n, w)} aria-pressed={name === n}
                className={cn("flex items-center gap-2 rounded-full bg-surface/60 py-1 pl-1 pr-3 text-sm shadow-[inset_0_0_0_1px_rgb(23_20_15/.06)] hover:bg-surface", name === n && "bg-surface shadow-[inset_0_0_0_1.5px_rgb(201_155_91)]")}
              >
                <BrandLogo name={n} domain={w} className="size-6 rounded-full" />{n}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={submit} className="grid gap-4" noValidate onChange={clearErrorOnEdit(setErrors)}>
          <div className="flex items-end gap-3">
            <BrandLogo key={website} name={name || "?"} domain={website.includes(".") ? website.replace(/^https?:\/\//, "").split("/")[0] : null} />
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <Field id="name" label="Name" error={errors.name}><Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix" aria-invalid={!!errors.name} /></Field>
              <Field id="website" label="Website (for the logo)" error={errors.website}><Input id="website" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="netflix.com" aria-invalid={!!errors.website} /></Field>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="amount" label={`Price (${currency})`} error={errors.amount}><Input id="amount" name="amount" inputMode="decimal" aria-invalid={!!errors.amount} /></Field>
            <Field id="cadence" label="Billed"><Select id="cadence" name="cadence" defaultValue="monthly"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nextDueOn" label="Next renewal" error={errors.nextDueOn}><Input id="nextDueOn" name="nextDueOn" type="date" aria-invalid={!!errors.nextDueOn} /></Field>
            <Field id="remindDaysBefore" label="Remind me (days before)"><Input id="remindDaysBefore" name="remindDaysBefore" type="number" min={0} max={30} defaultValue={2} /></Field>
          </div>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="autopay" defaultChecked className="size-4 accent-[rgb(var(--gold-2))]" /> Renews automatically</label>
          {add.error && <ErrorNote error={add.error} />}
          <Button type="submit" size="lg" disabled={add.isPending}>{add.isPending ? "Saving…" : "Save subscription"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
