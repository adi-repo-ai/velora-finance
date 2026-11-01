"use client";

import { fieldErrors, signInSchema } from "@velora/schemas";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { OAuthButtons } from "@/components/oauth-buttons";
import { ErrorNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { endSession, startSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase/client";

const NOTICES: Record<string, string> = {
  "reason=idle": "You were signed out after a period of inactivity.",
  "reason=closed": "You were signed out because the browser was closed. Tick “Remember me” to stay signed in.",
  "error=link": "That link has expired or was already used. Please try again.",
  "reset=done": "Password updated. Sign in with your new password.",
};
const noop = () => () => {};

export default function LoginPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const search = useSyncExternalStore(noop, () => location.search, () => "");
  const notice = Object.entries(NOTICES).find(([k]) => search.includes(k))?.[1];

  useEffect(endSession, []); // reaching this page means no one is signed in on this device

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setFailure(null);
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithPassword(parsed.data);
    if (error) { setBusy(false); return setFailure(error); }
    startSession(remember);
    router.replace("/"); // keep the spinner until the dashboard takes over
  }

  return (
    <form onSubmit={submit} className="glass enter grid gap-5 p-8" noValidate onChange={clearErrorOnEdit(setErrors)}>
      <h1 className="font-serif text-4xl">Welcome <em className="text-gold-2">back.</em></h1>
      {notice && <p role="status" className="rounded-2xl bg-gold-1/15 px-4 py-3 text-sm text-text">{notice}</p>}
      <OAuthButtons beforeRedirect={() => startSession(remember)} />
      <Field id="email" label="Email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" icon={<Mail />} placeholder="you@example.com" aria-invalid={!!errors.email} />
      </Field>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label-mono">Password</label>
          <Link href="/forgot-password" className="text-xs font-medium text-gold-2 underline-offset-4 hover:underline">Forgot password?</Link>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" aria-invalid={!!errors.password} />
        {errors.password && <p role="alert" className="text-[13px] text-negative">{errors.password}</p>}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[rgb(var(--gold-2))]" />
        <span>Remember me <span className="text-muted">for 30 days on this device</span></span>
      </label>
      {failure && <ErrorNote error={failure} />}
      <Button type="submit" size="lg" loading={busy}>{busy ? "Signing you in…" : "Sign in"}</Button>
      <p className="text-center text-sm text-muted">New to Velora? <Link href="/signup" className="font-medium text-gold-2 underline-offset-4 hover:underline">Create an account</Link></p>
    </form>
  );
}
