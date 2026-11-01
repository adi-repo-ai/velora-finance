"use client";

import { emailChangeSchema, fieldErrors } from "@velora/schemas";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ErrorNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>();
  const [failure, setFailure] = useState<Error | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = emailChangeSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setError(fieldErrors(parsed.error).email);
    setError(undefined);
    setBusy(true);
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (err) return setFailure(err);
    setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <div className="glass enter grid gap-3 p-8 text-center">
        <h1 className="font-serif text-4xl">Check your <em className="text-gold-2">inbox.</em></h1>
        {/* Same message whether or not the account exists, so this page can't be used to find out who has one. */}
        <p className="text-sm text-muted">If <b className="text-text">{sentTo}</b> has a Velora account, a link to reset the password is on its way. It works once and expires in an hour.</p>
        <Link href="/login" className="mt-2 text-sm font-medium text-gold-2 hover:underline">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass enter grid gap-5 p-8" noValidate>
      <div>
        <h1 className="font-serif text-4xl">Forgot your <em className="text-gold-2">password?</em></h1>
        <p className="mt-2 text-sm text-muted">Enter your email and we’ll send you a link to choose a new one.</p>
      </div>
      <Field id="email" label="Email" error={error}><Input id="email" name="email" type="email" autoComplete="email" icon={<Mail />} placeholder="you@example.com" autoFocus aria-invalid={!!error} /></Field>
      {failure && <ErrorNote error={failure} />}
      <Button type="submit" size="lg" loading={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
      <p className="text-center text-sm text-muted">Remembered it? <Link href="/login" className="font-medium text-gold-2 underline-offset-4 hover:underline">Sign in</Link></p>
    </form>
  );
}
