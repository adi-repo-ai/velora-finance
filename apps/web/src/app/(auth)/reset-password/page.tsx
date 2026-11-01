"use client";

import { fieldErrors, passwordChangeSchema } from "@velora/schemas";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { endSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase/client";

/** Reached from the reset email (the link signs the user in for this one purpose). */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<Error | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = passwordChangeSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const sb = getSupabase();
    const { error } = await sb.auth.updateUser({ password: parsed.data.password });
    if (error) { setBusy(false); return setFailure(error); }
    // Sign out everywhere so a stolen session can't outlive the reset; then sign in fresh.
    endSession();
    await sb.auth.signOut({ scope: "global" });
    router.replace("/login?reset=done");
  }

  return (
    <form onSubmit={submit} className="glass enter grid gap-5 p-8" noValidate onChange={clearErrorOnEdit(setErrors)}>
      <h1 className="font-serif text-4xl">Choose a new <em className="text-gold-2">password.</em></h1>
      <Field id="password" label="New password" error={errors.password}><PasswordInput id="password" name="password" autoComplete="new-password" suggest onSuggest={setConfirm} autoFocus aria-invalid={!!errors.password} /></Field>
      <Field id="confirm" label="Confirm new password" error={errors.confirm}><PasswordInput id="confirm" name="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} /></Field>
      {failure && <ErrorNote error={failure} />}
      <Button type="submit" size="lg" loading={busy}>{busy ? "Saving…" : "Save new password"}</Button>
    </form>
  );
}
