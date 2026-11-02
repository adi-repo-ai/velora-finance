"use client";

import { formatMoney, monthlyCost } from "@velora/core";
import { useAddBill, useBills, useCurrency, useDeleteBill, useMarkBillPaid, useUpdateBill } from "@velora/data";
import { billSchema, fieldErrors, type SubscriptionCategory, type Tables } from "@velora/schemas";
import { BellOff, Mail, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { RenewalCalendar } from "@/components/renewal-calendar";
import { SubscriptionImportDialog } from "@/components/subscription-import";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LogoDropzone } from "@/components/ui/logo-dropzone";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { fieldClass, Input, Select } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { CATEGORIES, POPULAR } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

type Sub = Tables<"recurring_items">;

const catOf = (s: Sub): SubscriptionCategory => s.category ?? "other";


const STATUS = { all: "All statuses", soon: "Renewing in 7 days", overdue: "Overdue", manual: "Auto-renew off", muted: "Reminders off" } as const;
type Status = keyof typeof STATUS;

const daysUntil = (iso: string) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en", { day: "numeric", month: "short" });
const matches = (s: Sub, status: Status) => {
  const d = daysUntil(s.next_due_on);
  return status === "all" || (status === "soon" && d >= 0 && d <= 7) || (status === "overdue" && d < 0) || (status === "manual" && !s.autopay) || (status === "muted" && !s.notify);
};

export default function SubscriptionsPage() {
  const subs = useBills("subscription");
  const currency = useCurrency();
  const [category, setCategory] = useState<SubscriptionCategory | "all">("all");
  const [status, setStatus] = useState<Status>("all");
  const list = subs.data ?? [];
  // Totals in the user's currency only; mixed-currency subs are rare and would need FX.
  const monthlyOf = (rows: Sub[]) => rows.filter((s) => s.currency === currency).reduce((sum, s) => sum + monthlyCost(s.amount, s.cadence), 0);
  const monthly = monthlyOf(list);
  const other = currency === "USD" ? "INR" : "USD";
  const otherMonthly = list.filter((s) => s.currency === other).reduce((sum, s) => sum + monthlyCost(s.amount, s.cadence), 0);
  const next = list.find((s) => daysUntil(s.next_due_on) >= 0);
  const shown = list.filter((s) => (category === "all" || catOf(s) === category) && matches(s, status));
  const groups = [...Map.groupBy(shown, catOf)].sort(([, a], [, b]) => monthlyOf(b) - monthlyOf(a));

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <section className="glass enter p-8 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="label-mono">Subscriptions</p><h1 className="mt-2 font-serif text-6xl leading-none">Every <em className="text-gold-2">renewal.</em></h1></div>
          <div className="flex gap-2"><SubscriptionImportDialog /><SubscriptionDialog /></div>
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Per month" value={formatMoney(monthly, currency)} hint={otherMonthly ? `+ ${formatMoney(otherMonthly, other)} in ${other}` : undefined} />
          <Stat label="Per year" value={formatMoney(monthly * 12, currency)} hint={otherMonthly ? `+ ${formatMoney(otherMonthly * 12, other)} in ${other}` : undefined} />
          <Stat label="Active" value={String(list.length)} />
          <Stat label="Next renewal" value={next ? shortDate(next.next_due_on) : "—"} hint={next?.name} />
        </dl>
      </section>

      {list.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Overview list={list} monthlyOf={monthlyOf} currency={currency} total={monthly} onPick={(c) => setCategory(c)} />
          <Upcoming list={list} />
        </div>
      )}

      {list.length > 0 && <RenewalCalendar items={list} title="Renews on" />}

      <section className="glass enter p-8 sm:p-10" style={{ ["--i" as string]: 2 }}>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>All <span className="text-muted">{list.length}</span></Chip>
          {(Object.keys(CATEGORIES) as SubscriptionCategory[]).map((c) => {
            const n = list.filter((s) => catOf(s) === c).length;
            return n ? <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{CATEGORIES[c].icon} {CATEGORIES[c].label} <span className="text-muted">{n}</span></Chip> : null;
          })}
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as Status)} className="ml-auto h-9 w-auto rounded-full text-sm">
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>

        <div className="mt-4">
          {subs.error && <ErrorNote error={subs.error} />}
          {subs.isPending && <div className="grid gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
          {subs.data?.length === 0 && <Empty title="No subscriptions yet" body="Add Netflix, Spotify, iCloud and the rest to see what they really cost you each year." />}
          {list.length > 0 && shown.length === 0 && <Empty title="Nothing matches" body="Try another category or status." />}
          {groups.map(([c, rows]) => (
            <div key={c} className="mt-6 first:mt-2">
              <div className="flex items-baseline justify-between border-b border-line pb-2">
                <h2 className="font-serif text-2xl">{CATEGORIES[c].icon} {CATEGORIES[c].label}</h2>
                <p className="text-sm text-muted">{rows.length} · {formatMoney(monthlyOf(rows), currency)}/mo</p>
              </div>
              <ul>{rows.map((s) => <SubscriptionRow key={s.id} s={s} />)}</ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SubscriptionRow({ s }: { s: Sub }) {
  const del = useDeleteBill();
  const renewed = useMarkBillPaid();
  const d = daysUntil(s.next_due_on);
  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-line py-4 last:border-0">
      <BrandLogo name={s.name} domain={s.website} src={s.logo} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{s.name}</p>
        <p className={cn("text-xs text-faint", d < 0 && "text-negative")}>
          {d < 0 ? `Renewal ${-d} ${d === -1 ? "day" : "days"} overdue` : d === 0 ? "Renews today" : `Renews ${shortDate(s.next_due_on)} · in ${d} ${d === 1 ? "day" : "days"}`} · {s.cadence}
        </p>
        {s.description && <p className="mt-1 truncate text-sm text-muted">{s.description}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
          <Pill tone={s.autopay ? "positive" : "muted"}><RefreshCw className="size-3" aria-hidden />{s.autopay ? "Auto-renew on" : "Auto-renew off"}</Pill>
          {!s.notify && <Pill tone="muted"><BellOff className="size-3" aria-hidden />Reminders off</Pill>}
          {s.account_email && <Pill tone="muted"><Mail className="size-3" aria-hidden />{s.account_email}</Pill>}
        </div>
      </div>
      <div className="text-right">
        <p className="font-serif text-2xl">{formatMoney(s.amount, s.currency)}</p>
        {s.cadence !== "monthly" && <p className="text-xs text-faint">≈ {formatMoney(monthlyCost(s.amount, s.cadence), s.currency)}/mo</p>}
      </div>
      <div className="flex gap-1.5">
        <Button variant="glass" size="sm" disabled={renewed.isPending} onClick={() => renewed.mutate(s.id)}>Mark renewed</Button>
        <SubscriptionDialog sub={s} />
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
}

/** Where the money goes by category, plus what needs attention. Clicking a bar filters the list. */
function Overview({ list, monthlyOf, currency, total, onPick }: { list: Sub[]; monthlyOf: (r: Sub[]) => number; currency: "USD" | "INR"; total: number; onPick: (c: SubscriptionCategory) => void }) {
  const rows = [...Map.groupBy(list, catOf)].map(([c, r]) => ({ c, amount: monthlyOf(r) })).sort((a, b) => b.amount - a.amount);
  const soon = list.filter((s) => matches(s, "soon")).length;
  const overdue = list.filter((s) => matches(s, "overdue")).length;
  const manual = list.filter((s) => !s.autopay).length;
  return (
    <section className="glass enter p-7" style={{ ["--i" as string]: 1 }}>
      <p className="label-mono">Spending overview</p>
      <p className="mt-2 font-serif text-4xl leading-none">{formatMoney(total, currency)}<span className="text-lg text-muted"> /month</span></p>
      <ul className="mt-5 grid gap-3">
        {rows.map(({ c, amount }) => {
          const pct = total ? Math.round((amount / total) * 100) : 0;
          return (
            <li key={c}>
              <button type="button" onClick={() => onPick(c)} className="grid w-full gap-1.5 text-left text-sm" aria-label={`${CATEGORIES[c].label}: ${formatMoney(amount, currency)} a month, ${pct}%. Show only this category`}>
                <span className="flex justify-between"><span>{CATEGORIES[c].icon} {CATEGORIES[c].label}</span><span className="text-muted">{formatMoney(amount, currency)} · {pct}%</span></span>
                <span className="h-2 overflow-hidden rounded-full bg-text/[.07]"><span className="block h-full rounded-full bg-gradient-to-r from-gold-1 to-gold-2" style={{ width: `${Math.max(pct, 2)}%` }} /></span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <Pill tone={soon ? "gold" : "muted"}>{soon} renewing this week</Pill>
        <Pill tone={overdue ? "negative" : "muted"}>{overdue} overdue</Pill>
        <Pill tone="muted">{manual} not auto-renewing</Pill>
      </div>
    </section>
  );
}

/** The next 30 days of renewals; first five, with See all. */
function Upcoming({ list }: { list: Sub[] }) {
  const [all, setAll] = useState(false);
  const soon = list.filter((s) => { const d = daysUntil(s.next_due_on); return d >= 0 && d <= 30; });
  const shown = all ? soon : soon.slice(0, 5);
  return (
    <section className="glass enter p-7" style={{ ["--i" as string]: 1 }}>
      <div className="flex items-baseline justify-between">
        <p className="label-mono">Upcoming renewals · 30 days</p>
        {soon.length > 5 && <button type="button" onClick={() => setAll(!all)} className="text-sm font-medium text-gold-2 hover:underline">{all ? "Show less" : `See all ${soon.length}`}</button>}
      </div>
      {soon.length === 0 && <p className="mt-6 text-sm text-muted">Nothing renews in the next 30 days.</p>}
      <ol className="mt-4 grid gap-1">
        {shown.map((s) => {
          const d = daysUntil(s.next_due_on);
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface/50">
              <span className="w-12 text-center leading-none"><span className="block font-serif text-xl">{new Date(`${s.next_due_on}T00:00:00`).getDate()}</span><span className="label-mono text-[9px]">{new Date(`${s.next_due_on}T00:00:00`).toLocaleString("en", { month: "short" })}</span></span>
              <BrandLogo name={s.name} domain={s.website} src={s.logo} className="size-9 rounded-xl" />
              <span className="min-w-0 flex-1"><span className="block truncate">{s.name}</span><span className={cn("text-xs text-faint", d <= 3 && "text-gold-2")}>{d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`}{!s.autopay && " · pay manually"}</span></span>
              <span className="font-serif text-xl">{formatMoney(s.amount, s.currency)}</span>
            </li>
          );
        })}
      </ol>
    </section>
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex items-center gap-1.5 rounded-full bg-surface/50 px-3.5 py-1.5 text-sm shadow-[inset_0_0_0_1px_rgb(23_20_15/.06)] transition hover:bg-surface", active && "bg-surface font-medium shadow-[inset_0_0_0_1.5px_rgb(201_155_91)]")}>
      {children}
    </button>
  );
}

function Pill({ tone, children }: { tone: "positive" | "negative" | "gold" | "muted"; children: React.ReactNode }) {
  const tones = { positive: "bg-positive/10 text-positive", negative: "bg-negative/10 text-negative", gold: "bg-gold-1/20 text-gold-2", muted: "bg-text/[.06] text-muted" };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium", tones[tone])}>{children}</span>;
}

/** Add (no `sub`) or edit an existing subscription. */
function SubscriptionDialog({ sub }: { sub?: Sub }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(sub?.name ?? "");
  const [website, setWebsite] = useState(sub?.website ?? "");
  const [category, setCategory] = useState<SubscriptionCategory | "">(sub?.category ?? "");
  const [logo, setLogo] = useState<string | null>(sub?.logo ?? null);
  const [notify, setNotify] = useState(sub?.notify ?? true);
  const currency = useCurrency();
  const add = useAddBill();
  const update = useUpdateBill();
  const save = sub ? update : add;

  function pick(n: string, w: string, c: SubscriptionCategory) {
    setName(n); setWebsite(w); setCategory(c); setErrors({});
  }


  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const f = Object.fromEntries(fd) as Record<string, string>;
    const input = {
      kind: "subscription" as const, name, website, category: category || undefined, logo: logo ?? undefined,
      description: f.description ?? "", accountEmail: f.accountEmail ?? "", notify, currency: (f.currency ?? currency) as "USD" | "INR",
      amount: f.amount ?? "", cadence: (f.cadence ?? "monthly") as "monthly", nextDueOn: f.nextDueOn ?? "",
      remindDaysBefore: notify ? Number(f.remindDaysBefore ?? 7) : sub?.remind_days_before ?? 7, autopay: fd.get("autopay") === "on",
    };
    const parsed = billSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    const done = { onSuccess: () => { setOpen(false); if (!sub) { pick("", "", "" as SubscriptionCategory); setLogo(null); } } };
    if (sub) update.mutate({ id: sub.id, input }, done);
    else add.mutate(input, done);
  }

  const domain = website.includes(".") ? website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] : null;
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { save.reset(); setErrors({}); } }}>
      <DialogTrigger asChild>
        {sub ? <Button variant="ghost" size="icon" aria-label={`Edit ${sub.name}`}><Pencil className="size-4" /></Button> : <Button>Add subscription</Button>}
      </DialogTrigger>
      <DialogContent title={sub ? `Edit ${sub.name}` : "New subscription"} className="w-[min(640px,calc(100vw-32px))]">
        {!sub && (
          <div>
            <p className="label-mono">Popular</p>
            <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
              {POPULAR.map(([n, w, c]) => (
                <button
                  type="button" key={n} onClick={() => pick(n, w, c)} aria-pressed={name === n}
                  className={cn("flex items-center gap-2 rounded-full bg-surface/60 py-1 pl-1 pr-3 text-sm shadow-[inset_0_0_0_1px_rgb(23_20_15/.06)] hover:bg-surface", name === n && "bg-surface shadow-[inset_0_0_0_1.5px_rgb(201_155_91)]")}
                >
                  <BrandLogo name={n} domain={w} className="size-6 rounded-full" />{n}
                </button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={submit} className="grid gap-4" noValidate onChange={clearErrorOnEdit(setErrors)}>
          <div>
            <LogoDropzone value={logo} onChange={setLogo} preview={<BrandLogo key={domain ?? ""} name={name || "?"} domain={domain} className="size-16" />} />
            {errors.logo && <p role="alert" className="mt-2 text-xs text-negative">{errors.logo}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Name" error={errors.name}><Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix" maxLength={60} aria-invalid={!!errors.name} /></Field>
            <Field id="website" label="Website (for the logo)" error={errors.website}><Input id="website" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="netflix.com" aria-invalid={!!errors.website} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_1.3fr_1fr]">
            <Field id="category" label="Category">
              <Select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}>
                <option value="">Choose…</option>
                {(Object.keys(CATEGORIES) as SubscriptionCategory[]).map((c) => <option key={c} value={c}>{CATEGORIES[c].icon} {CATEGORIES[c].label}</option>)}
              </Select>
            </Field>
            <Field id="amount" label="Price" error={errors.amount}>
              <div className="flex gap-2">
                <Select name="currency" aria-label="Currency" defaultValue={sub?.currency ?? currency} className="w-[92px] shrink-0 px-3">
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                </Select>
                <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" defaultValue={sub ? String(sub.amount / 100) : undefined} aria-invalid={!!errors.amount} />
              </div>
            </Field>
            <Field id="cadence" label="Billed"><Select id="cadence" name="cadence" defaultValue={sub?.cadence ?? "monthly"}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nextDueOn" label="Next renewal" error={errors.nextDueOn}><DatePicker id="nextDueOn" name="nextDueOn" defaultValue={sub?.next_due_on} aria-invalid={!!errors.nextDueOn} /></Field>
            <Field id="accountEmail" label="Billing email (optional)" error={errors.accountEmail}><Input id="accountEmail" name="accountEmail" type="email" defaultValue={sub?.account_email ?? ""} placeholder="The email this plan is under" aria-invalid={!!errors.accountEmail} /></Field>
          </div>
          <Field id="description" label="Description (optional)" error={errors.description}>
            <textarea id="description" name="description" rows={2} maxLength={300} defaultValue={sub?.description ?? ""} placeholder="e.g. Family plan, shared with 4" className={cn(fieldClass, "h-auto resize-none py-3")} aria-invalid={!!errors.description} />
          </Field>
          <div className="grid gap-3 rounded-3xl bg-surface/50 p-4 text-sm">
            <label className="flex items-center gap-3"><input type="checkbox" name="autopay" defaultChecked={sub?.autopay ?? true} className="size-4 accent-[rgb(var(--gold-2))]" /><span><b className="font-medium">Auto-renews</b> <span className="text-muted">— Velora moves it to the next cycle when the date passes</span></span></label>
            <label className="flex items-center gap-3"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-[rgb(var(--gold-2))]" /><span><b className="font-medium">Remind me</b> <span className="text-muted">— by email a week before, and on your phone</span></span></label>
            {notify && (
              <label className="flex items-center gap-3 pl-7 text-muted">Phone reminder
                <Input name="remindDaysBefore" type="number" min={0} max={30} defaultValue={sub?.remind_days_before ?? 7} className="h-9 w-20" aria-label="Phone reminder, days before" />days before</label>
            )}
          </div>
          {save.error && <ErrorNote error={save.error} />}
          <Button type="submit" size="lg" loading={save.isPending}>{sub ? "Save changes" : "Save subscription"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
