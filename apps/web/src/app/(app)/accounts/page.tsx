"use client";

import { formatMoney } from "@velora/core";
import { useAccounts, useAddAccount, useAuthUser, useCurrency, useDeleteAccount, useDeleteMyAccount, useProfile, useUpdateProfile } from "@velora/data";
import { accountSchema, emailChangeSchema, fieldErrors, passwordChangeSchema, profileSchema } from "@velora/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bell, Check, ChevronDown, Coins, KeyRound, Landmark, LifeBuoy, Link2, LogOut, Mail, MonitorSmartphone,
  ShieldCheck, SlidersHorizontal, Trash2, UserRound, type LucideIcon,
} from "lucide-react";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Empty, ErrorNote, Skeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TYPES = ["checking", "savings", "credit", "loan", "investment", "cash", "wallet"] as const;

const SECTIONS = [
  ["profile", "Profile", UserRound],
  ["accounts", "Bank accounts", Landmark],
  ["security", "Sign-in & security", ShieldCheck],
  ["preferences", "Preferences", SlidersHorizontal],
  ["help", "Help & support", LifeBuoy],
  ["danger", "Account", LogOut],
] as const;

const noop = () => () => {};

export default function AccountsPage() {
  // This large page hydrates after the user's data has often already loaded; rendering the
  // sections only once hydrated keeps the server and first client render identical.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Settings" className="glass enter hidden h-fit flex-col gap-1 p-3 lg:sticky lg:top-28 lg:flex">
        {SECTIONS.map(([id, label, Icon]) => (
          <a key={id} href={`#${id}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted transition hover:bg-surface/70 hover:text-text">
            <Icon className="size-4" aria-hidden />{label}
          </a>
        ))}
      </nav>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
        {hydrated ? (
          <>
            <ProfileSection />
            <BankAccountsSection />
            <SecuritySection />
            <PreferencesSection />
            <HelpSection />
            <DangerSection />
          </>
        ) : (
          <Skeleton className="h-96 w-full rounded-[30px]" />
        )}
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, description, i, children }: { id: string; icon: LucideIcon; title: string; description?: string; i: number; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="glass enter scroll-mt-28 p-7 sm:p-9" style={{ ["--i" as string]: i }}>
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold-2/15 text-gold-2" aria-hidden><Icon className="size-5" /></span>
        <div>
          <h2 id={`${id}-title`} className="font-serif text-3xl leading-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ProfileSection() {
  const { data: profile } = useProfile();
  const { data: user } = useAuthUser();
  const update = useUpdateProfile();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const initial = profile?.display_name?.trim()[0]?.toUpperCase() ?? "";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget)) as { displayName: string; homeCountry: "US" | "IN" };
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate(input, { onSuccess: () => setSaved(true) });
  }

  return (
    <Section id="profile" icon={UserRound} title="Profile" i={0}>
      <div className="flex items-center gap-5">
        <span className="grid size-20 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe9c7,#b88449_60%,#3b2a17)] font-serif text-4xl text-white shadow-[inset_0_0_0_3px_rgb(255_255_255/.35),0_14px_30px_-12px_rgb(120_80_30/.5)]" aria-hidden>{initial}</span>
        <div className="min-w-0">
          <p className="truncate font-serif text-4xl leading-tight">{profile?.display_name || "—"}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
          {user?.created_at && <p className="label-mono mt-1">Member since {new Date(user.created_at).toLocaleDateString("en", { month: "long", year: "numeric" })}</p>}
        </div>
      </div>
      {profile && (
        <form onSubmit={submit} onChange={() => { setSaved(false); }} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
          <Field id="displayName" label="Name" error={errors.displayName}><Input id="displayName" name="displayName" defaultValue={profile.display_name} maxLength={60} aria-invalid={!!errors.displayName} /></Field>
          <Field id="homeCountry" label="Country & currency">
            <Select id="homeCountry" name="homeCountry" defaultValue={profile.home_country}>
              <option value="US">🇺🇸 United States · USD</option>
              <option value="IN">🇮🇳 India · INR</option>
            </Select>
          </Field>
          <p className="text-xs text-muted sm:col-span-2">Changing country switches the currency reports use. Existing amounts aren’t converted.</p>
          {update.error && <div className="sm:col-span-2"><ErrorNote error={update.error} /></div>}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save profile"}</Button>
            {saved && <p role="status" className="flex items-center gap-1.5 text-sm text-positive"><Check className="size-4" aria-hidden />Saved</p>}
          </div>
        </form>
      )}
    </Section>
  );
}

function BankAccountsSection() {
  const accounts = useAccounts();
  const del = useDeleteAccount();
  return (
    <Section id="accounts" icon={Landmark} title="Bank accounts" description="Add accounts manually and import statements as CSV. Bank sync (Plaid in the US, Account Aggregator in India) is coming." i={1}>
      <div className="flex justify-end"><AddAccountDialog /></div>
      <div className="mt-2">
        {accounts.error && <ErrorNote error={accounts.error} />}
        {accounts.isPending && <Skeleton className="h-32 w-full" />}
        {accounts.data?.length === 0 && <Empty title="No accounts yet" body="Add your main bank account with today's balance to begin." />}
        <ul>
          {accounts.data?.map((a) => (
            <li key={a.id} className="flex items-center gap-4 border-b border-line py-4 last:border-0">
              <span className="grid size-11 place-items-center rounded-2xl bg-surface/60 font-mono text-[10px] uppercase tracking-widest text-muted shadow-[inset_0_0_0_1px_rgb(23_20_15/.06)]">{a.mask ?? a.type.slice(0, 3)}</span>
              <div className="min-w-0 flex-1"><p className="truncate">{a.name}</p><p className="text-xs capitalize text-faint">{a.type}{a.institution && ` · ${a.institution}`} · {a.currency}</p></div>
              <span className={cn("font-serif text-2xl", a.balance < 0 && "text-negative")}>{formatMoney(a.balance, a.currency, { cents: true })}</span>
              <ConfirmDialog
                title="Delete account?"
                description={<>“{a.name}” and <b>all of its transactions</b> will be permanently deleted. Your reports will update. This can’t be undone.</>}
                onConfirm={() => del.mutateAsync(a.id)}
                trigger={<Button variant="danger" size="icon" aria-label={`Delete ${a.name}`}><Trash2 className="size-4" /></Button>}
              />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

const PROVIDER_LABEL: Record<string, string> = { email: "Email & password", google: "Google", github: "GitHub", azure: "Microsoft", apple: "Apple" };

function SecuritySection() {
  const { data: user } = useAuthUser();
  const methods = [...new Set(user?.identities?.map((i) => i.provider) ?? [])];
  return (
    <Section id="security" icon={ShieldCheck} title="Sign-in & security" i={2}>
      <div className="grid gap-3">
        <Row icon={Mail} title="Email" body={user?.email ?? "—"}><ChangeEmailDialog current={user?.email} /></Row>
        <Row icon={KeyRound} title="Password" body={methods.includes("email") ? "Use at least 8 characters." : "You sign in with a connected account. Set a password to also sign in by email."}>
          <ChangePasswordDialog />
        </Row>
        <Row icon={Link2} title="Connected sign-in methods" body={methods.length ? methods.map((m) => PROVIDER_LABEL[m] ?? m).join(" · ") : "—"} />
      </div>
    </Section>
  );
}

function Row({ icon: Icon, title, body, children }: { icon: LucideIcon; title: string; body: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-surface/50 p-4 shadow-[inset_0_0_0_1px_rgb(23_20_15/.05)]">
      <Icon className="size-5 shrink-0 text-gold-2" aria-hidden />
      <div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="break-words text-sm text-muted">{body}</p></div>
      {children}
    </div>
  );
}

function ChangeEmailDialog({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [failure, setFailure] = useState<Error | null>(null);
  const [sentTo, setSentTo] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = emailChangeSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setError(fieldErrors(parsed.error).email);
    if (parsed.data.email === current) return setError("That's already your email");
    setError(undefined);
    setBusy(true);
    const { error: err } = await getSupabase().auth.updateUser({ email: parsed.data.email }, { emailRedirectTo: `${location.origin}/auth/callback` });
    setBusy(false);
    if (err) return setFailure(err);
    setSentTo(parsed.data.email);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSentTo(undefined); setFailure(null); setError(undefined); } }}>
      <DialogTrigger asChild><Button variant="glass" size="sm">Change</Button></DialogTrigger>
      <DialogContent title="Change email" description="We'll send a confirmation link. Your email changes once you click it.">
        {sentTo ? (
          <p role="status" className="rounded-2xl bg-positive/10 px-4 py-3 text-sm text-positive">Check <b>{sentTo}</b> for a confirmation link. Depending on your settings, your current inbox may get one too.</p>
        ) : (
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <Field id="email" label="New email" error={error}><Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!error} /></Field>
            {failure && <ErrorNote error={failure} />}
            <Button type="submit" size="lg" disabled={busy}>{busy ? "Sending…" : "Send confirmation link"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<Error | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = passwordChangeSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) return setFailure(error);
    setDone(true);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDone(false); setFailure(null); setErrors({}); setConfirm(""); } }}>
      <DialogTrigger asChild><Button variant="glass" size="sm">Change</Button></DialogTrigger>
      <DialogContent title="Change password">
        {done ? (
          <p role="status" className="rounded-2xl bg-positive/10 px-4 py-3 text-sm text-positive">Password updated. Use it next time you sign in.</p>
        ) : (
          <form onSubmit={submit} className="grid gap-4" noValidate onChange={clearErrorOnEdit(setErrors)}>
            <Field id="password" label="New password" error={errors.password}><PasswordInput id="password" name="password" autoComplete="new-password" suggest onSuggest={setConfirm} aria-invalid={!!errors.password} /></Field>
            <Field id="confirm" label="Confirm new password" error={errors.confirm}><PasswordInput id="confirm" name="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} /></Field>
            {failure && <ErrorNote error={failure} />}
            <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreferencesSection() {
  const currency = useCurrency();
  return (
    <Section id="preferences" icon={SlidersHorizontal} title="Preferences" i={3}>
      <div className="grid gap-3">
        <Row icon={MonitorSmartphone} title="Appearance" body="Follows your device: Pearl in light mode, Noir in dark mode." />
        <Row icon={Coins} title="Currency format" body={`${currency} · ${formatMoney(12345678, currency)}`} />
        <Row icon={Bell} title="Bill & renewal reminders" body="Sent as push notifications by the Velora mobile app. Set the lead time on each bill or subscription." />
      </div>
    </Section>
  );
}

const FAQ = [
  ["Is my data safe?", "Your data is stored in a Postgres database with row-level security, so each account can only ever read its own rows. Velora never sees your bank passwords."],
  ["How do I import transactions?", "Open Activity → Import CSV and choose a statement exported from your bank. Re-importing the same file never creates duplicates."],
  ["What's the difference between Bills and Subscriptions?", "Bills are payments like rent, card dues and utilities. Subscriptions are services like Netflix or Spotify, with logos and yearly totals. Both get reminders and count towards Safe to spend."],
  ["Does removing a subscription cancel it?", "No. It only stops tracking it in Velora. Cancel with the provider directly."],
  ["Can I use both USD and INR?", "Yes. Each account has its own currency. Reports use the currency of your home country, set in Profile."],
] as const;

function HelpSection() {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <Section id="help" icon={LifeBuoy} title="Help & support" i={4}>
      <div className="grid gap-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group rounded-3xl bg-surface/50 px-5 py-4 shadow-[inset_0_0_0_1px_rgb(23_20_15/.05)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{q}<ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" aria-hidden /></summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
      {support && (
        <Button asChild variant="glass" className="mt-5"><a href={`mailto:${support}`}><Mail className="size-4" aria-hidden />Contact support</a></Button>
      )}
    </Section>
  );
}

function DangerSection() {
  const router = useRouter();
  const qc = useQueryClient();
  const deleteMe = useDeleteMyAccount();

  async function signOut() {
    await getSupabase().auth.signOut();
    qc.clear(); // drop the previous user's cached data
    router.replace("/login");
  }

  return (
    <Section id="danger" icon={LogOut} title="Account" i={5}>
      <div className="grid gap-3">
        <Row icon={LogOut} title="Sign out" body="Sign out of Velora on this device."><Button variant="glass" size="sm" onClick={signOut}>Sign out</Button></Row>
        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-negative/[.07] p-4 shadow-[inset_0_0_0_1px_rgb(215_85_61/.2)]">
          <Trash2 className="size-5 shrink-0 text-negative" aria-hidden />
          <div className="min-w-0 flex-1"><p className="font-medium">Delete my Velora account</p><p className="text-sm text-muted">Permanently deletes your profile, accounts, transactions, budgets, goals and bills.</p></div>
          <ConfirmDialog
            title="Delete your account?"
            description="Everything in Velora will be permanently deleted. This can’t be undone."
            confirmLabel="Delete forever"
            requireText="DELETE"
            onConfirm={async () => { await deleteMe.mutateAsync(); qc.clear(); router.replace("/login"); }}
            trigger={<Button variant="destructive" size="sm">Delete account</Button>}
          />
        </div>
      </div>
    </Section>
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
